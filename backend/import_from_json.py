import json
import os
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import models
import uuid
from dateutil.parser import isoparse

def parse_date(date_obj):
    if isinstance(date_obj, dict) and '$date' in date_obj:
        return isoparse(date_obj['$date'])
    elif isinstance(date_obj, str):
        return isoparse(date_obj)
    return None

def import_data():
    """
    Imports data from JSON files into the PostgreSQL database.
    """
    # --- 1. SETUP ---
    data_dir = os.path.join(os.getcwd(), 'mongo_export_20260214_171947')
    db: Session = next(get_db())

    # Mappings for old IDs to new PostgreSQL IDs
    user_map = {}
    instructor_map = {}
    student_map = {}
    course_map = {}
    chapter_map = {}
    certificate_map = {}

    # --- 2. MIGRATE COURSES ---
    print("Migrating courses...")
    with open(os.path.join(data_dir, 'courses.json')) as f:
        mongo_courses = json.load(f)

    for course in mongo_courses:
        duration_str = course.get('duration', '0')
        duration_months = 0
        if duration_str:
            # Handle cases like "5-6 ամիս" or "3 ամիս"
            try:
                duration_months = int(duration_str.split(' ')[0].split('-')[0])
            except ValueError:
                pass # Default to 0 if parsing fails
        
        new_course = models.Course(
            title=course.get('title'),
            description=course.get('description'),
            curriculum_url=course.get('curriculum_url'),
            curriculum=course.get('curriculum'),
            icon_url=course.get('icon_url'),
            duration_months=duration_months,
            start_date=parse_date(course.get('start_date')),
            schedule=course.get('schedule'),
            monthly_payment=course.get('monthly_payment'),
            total_payment=course.get('total_payment'),
            is_active=course.get('is_active', True),
            created_at=parse_date(course.get('created_at')),
        )
        db.add(new_course)
        db.commit()
        db.refresh(new_course)
        course_map[course['_id']] = new_course.id
    print(f"Migrated {len(course_map)} courses.")


    # --- 3. MIGRATE INSTRUCTORS ---
    print("Migrating instructors...")
    with open(os.path.join(data_dir, 'instructors.json')) as f:
        mongo_instructors = json.load(f)

    for instructor in mongo_instructors:
        # Assuming instructors are also users, we need to create a user record for them
        email = f"{instructor.get('firstName', '').lower()}.{instructor.get('lastName', '').lower()}@example.com"
        new_user = models.UserPersonal(
            first_name=instructor.get('firstName'),
            last_name=instructor.get('lastName'),
            email=email,
            phone=instructor.get('contacts', {}).get('phone'),
            profile_image=instructor.get('photo_url'),
            password_hash=str(uuid.uuid4()), # Create a random password hash
            role='instructor',
            social_links=instructor.get('contacts'),
            is_active=True,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        new_instructor = models.Instructor(
            user_id=new_user.id,
            bio=instructor.get('profession'),
            skills=instructor.get('skills'),
            proficiency=instructor.get('softwareProficiency'),
            is_active=True,
        )
        db.add(new_instructor)
        db.commit()
        db.refresh(new_instructor)
        instructor_map[instructor['_id']] = new_instructor.id
    print(f"Migrated {len(instructor_map)} instructors.")

    # Assign instructors to courses
    for course in mongo_courses:
        if course['_id'] in course_map:
            for instructor_name in course.get('instructor', []):
                # Find instructor by name
                for inst_id, inst in instructor_map.items():
                    instructor_user = db.query(models.UserPersonal).filter_by(id=inst.user_id).first()
                    if instructor_user and f"{instructor_user.first_name} {instructor_user.last_name}" == instructor_name:
                        course_instructor = models.CourseInstructor(
                            course_id=course_map[course['_id']],
                            instructor_id=inst.id
                        )
                        db.add(course_instructor)
                        break
    db.commit()
    print("Assigned instructors to courses.")

    # --- 4. MIGRATE MATERIALS (CHAPTERS AND LESSONS) ---
    print("Migrating materials...")
    with open(os.path.join(data_dir, 'materials.json')) as f:
        mongo_materials = json.load(f)
    
    for material in mongo_materials:
        if material['course_id']['$oid'] in course_map:
            for i, chapter_data in enumerate(material.get('chapters', [])):
                new_chapter = models.Chapter(
                    course_id=course_map[material['course_id']['$oid']],
                    title=chapter_data.get('title'),
                    description=chapter_data.get('description'),
                    order_index=i
                )
                db.add(new_chapter)
                db.commit()
                db.refresh(new_chapter)

                for j, lesson_data in enumerate(chapter_data.get('lessons', [])):
                    new_lesson = models.Lesson(
                        chapter_id=new_chapter.id,
                        title=lesson_data.get('title'),
                        description=lesson_data.get('content_url'),
                        order_index=j,
                        resource_links=lesson_data.get('resources')
                    )
                    db.add(new_lesson)
            db.commit()
    print("Migrated materials.")

    # --- 5. MIGRATE ML_PROJECTS ---
    print("Migrating ml_projects...")
    with open(os.path.join(data_dir, 'ml_projects.json')) as f:
        mongo_projects = json.load(f)

    for project in mongo_projects:
        # We need to create a student for the project
        email = project.get('student_email') or f"student_{str(uuid.uuid4())}@example.com"
        new_user = models.UserPersonal(
            first_name=project.get('student_name', '').split(' ')[0],
            last_name=' '.join(project.get('student_name', '').split(' ')[1:]),
            email=email,
            phone=project.get('student_phone'),
            password_hash=str(uuid.uuid4()),
            role='student',
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        new_student = models.Student(
            user_id=new_user.id,
            status='confirmed',
        )
        db.add(new_student)
        db.commit()
        db.refresh(new_student)
        
        if project['course_id']['$oid'] in course_map:
            new_project = models.Project(
                course_id=course_map[project['course_id']['$oid']],
                student_id=new_student.id,
                title=project.get('title'),
                description=project.get('description'),
                image_urls=[viz['image_path'] for viz in project.get('visualizations', [])],
                links=project.get('links'),
                is_featured=project.get('is_featured'),
                is_published=True,
                created_at=parse_date(project.get('created_at')),
            )
            db.add(new_project)
    db.commit()
    print("Migrated ml_projects.")

    # --- 6. MIGRATE REGISTRATIONS ---
    print("Migrating registrations...")
    with open(os.path.join(data_dir, 'registrations.json')) as f:
        mongo_registrations = json.load(f)

    for reg in mongo_registrations:
        # We need to create a student for the registration
        new_user = models.UserPersonal(
            first_name=reg.get('first_name'),
            last_name=reg.get('last_name'),
            email=reg.get('email'),
            phone=reg.get('phone'),
            password_hash=str(uuid.uuid4()),
            role='student',
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        new_student = models.Student(
            user_id=new_user.id,
            status=reg.get('status'),
        )
        db.add(new_student)
        db.commit()
        db.refresh(new_student)

        if reg['course_id']['$oid'] in course_map:
            new_reg = models.Registration(
                student_id=new_student.id,
                course_id=course_map[reg['course_id']['$oid']],
                status=reg.get('status'),
                message=reg.get('message'),
                registration_date=parse_date(reg.get('timestamp')),
            )
            db.add(new_reg)
    db.commit()
    print("Migrated registrations.")


    # --- 7. MIGRATE VISITS ---
    print("Migrating visits...")
    with open(os.path.join(data_dir, 'visits.json')) as f:
        mongo_visits = json.load(f)
    for visit in mongo_visits:
        new_visit = models.Visit(
            timestamp=parse_date(visit.get('timestamp')),
            ip_address=visit.get('ip_address'),
            page_url=visit.get('page'),
            user_agent=visit.get('user_agent'),
            country=visit.get('country'),
            city=visit.get('city'),
            referrer=visit.get('referrer'),
            is_bot=visit.get('is_bot'),
        )
        db.add(new_visit)
    db.commit()
    print("Migrated visits.")


    # --- Close connections ---
    db.close()
    print("Import completed successfully!")

if __name__ == "__main__":
    import_data()
