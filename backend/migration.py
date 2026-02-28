import sys
import os
from sqlalchemy.orm import Session
# Add the temporary directory to the python path to import the DataManager
sys.path.append(os.path.abspath('/Users/andranikmanukyan/.gemini/tmp/39fe54bd0ec68b4e262c8b343c95771924bfd31c599e7f6e7c5264db8bdca07c'))

from data_manager import DataManager
from app.core.database import get_db, engine
from app.models import models
import uuid

def migrate_data():
    """
    Migrates data from MongoDB to PostgreSQL.
    """
    # --- 1. SETUP ---
    # MongoDB connection
    mongo_uri = "mongodb://localhost:27017/"
    db_name = "logiclab_db"
    mongo_manager = DataManager(mongo_uri=mongo_uri, db_name=db_name)

    # PostgreSQL session
    db: Session = next(get_db())

    # Mappings for MongoDB ObjectIDs to new PostgreSQL IDs
    user_map = {}
    instructor_map = {}
    student_map = {}
    course_map = {}
    chapter_map = {}
    certificate_map = {}

    # --- 2. MIGRATE USERS ---
    print("Migrating users...")
    mongo_users = mongo_manager.users.find()
    for user in mongo_users:
        new_user = models.UserPersonal(
            first_name=user.get('first_name'),
            last_name=user.get('last_name'),
            email=user.get('email'),
            phone=user.get('phone'),
            profile_image=user.get('profile_image'),
            password_hash=user.get('password_hash'),
            role=user.get('role'),
            social_links=user.get('social_links'),
            country=user.get('country'),
            city=user.get('city'),
            is_active=user.get('is_active', True),
            created_at=user.get('created_at'),
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        user_map[user['_id']] = new_user.id
    print(f"Migrated {len(user_map)} users.")

    # --- 3. MIGRATE INSTRUCTORS ---
    print("Migrating instructors...")
    mongo_instructors = mongo_manager.instructors.find()
    for instructor in mongo_instructors:
        if instructor.get('user_id') in user_map:
            new_instructor = models.Instructor(
                user_id=user_map[instructor['user_id']],
                bio=instructor.get('bio', {}).get('en'),
                skills=instructor.get('skills'),
                proficiency=instructor.get('proficiency'),
                is_active=instructor.get('is_active', True),
                created_at=instructor.get('created_at'),
            )
            db.add(new_instructor)
            db.commit()
            db.refresh(new_instructor)
            instructor_map[instructor['_id']] = new_instructor.id
    print(f"Migrated {len(instructor_map)} instructors.")

    # --- 4. MIGRATE STUDENTS ---
    print("Migrating students...")
    mongo_students = mongo_manager.students.find()
    for student in mongo_students:
        if student.get('user_id') in user_map:
            new_student = models.Student(
                user_id=user_map[student['user_id']],
                status='confirmed', # Assuming all students in old db are confirmed
            )
            db.add(new_student)
            db.commit()
            db.refresh(new_student)
            student_map[student['_id']] = new_student.id
    print(f"Migrated {len(student_map)} students.")


    # --- 5. MIGRATE COURSES, CHAPTERS, and LESSONS ---
    print("Migrating courses, chapters, and lessons...")
    mongo_courses = mongo_manager.courses.find()
    for course in mongo_courses:
        new_course = models.Course(
            title=course.get('title'),
            description=course.get('description'),
            curriculum_url=course.get('curriculum_url'),
            curriculum=course.get('curriculum'),
            icon_url=course.get('icon_url'),
            duration_months=course.get('duration_months'),
            start_date=course.get('start_date'),
            schedule=course.get('schedule'),
            monthly_payment=course.get('monthly_payment'),
            total_payment=course.get('total_payment'),
            is_active=course.get('is_active', True),
            created_at=course.get('created_at'),
        )
        db.add(new_course)
        db.commit()
        db.refresh(new_course)
        course_map[course['_id']] = new_course.id

        # Assign instructors to course
        for instructor_id in course.get('instructors', []):
            if instructor_id in instructor_map:
                course_instructor = models.CourseInstructor(
                    course_id=new_course.id,
                    instructor_id=instructor_map[instructor_id]
                )
                db.add(course_instructor)
        db.commit()

        # Migrate chapters and lessons for this course
        mongo_materials = mongo_manager.get_materials_by_course(course['_id'])
        for material in mongo_materials:
            for i, chapter_data in enumerate(material.get('chapters', [])):
                new_chapter = models.Chapter(
                    course_id=new_course.id,
                    title=chapter_data.get('title'),
                    description=chapter_data.get('description'),
                    order_index=i
                )
                db.add(new_chapter)
                db.commit()
                db.refresh(new_chapter)
                # chapter_map[chapter_data['_id']] = new_chapter.id # mongo has no chapter id

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

    print(f"Migrated {len(course_map)} courses.")

    # --- 6. MIGRATE PROJECTS ---
    print("Migrating projects...")
    mongo_projects = mongo_manager.projects.find()
    for project in mongo_projects:
        if project.get('student_id') in student_map and project.get('course_id') in course_map:
            new_project = models.Project(
                course_id=course_map[project['course_id']],
                student_id=student_map[project['student_id']],
                title=project.get('title'),
                description=project.get('description'),
                image_urls=project.get('image_urls'),
                links=project.get('links'),
                is_featured=project.get('is_featured'),
                is_published=project.get('is_published'),
                created_at=project.get('created_at'),
            )
            db.add(new_project)
    db.commit()
    print("Migrated projects.")

    # --- 7. MIGRATE REGISTRATIONS ---
    print("Migrating registrations...")
    mongo_registrations = mongo_manager.registrations.find()
    for reg in mongo_registrations:
        if reg.get('student_id') in student_map and reg.get('course_id') in course_map:
            new_reg = models.Registration(
                student_id=student_map[reg['student_id']],
                course_id=course_map[reg['course_id']],
                status=reg.get('status'),
                message=reg.get('message'),
                registration_date=reg.get('timestamp'),
            )
            db.add(new_reg)
    db.commit()
    print("Migrated registrations.")

    # --- 8. MIGRATE SUCCESS STORIES ---
    print("Migrating success stories...")
    mongo_stories = mongo_manager.success_stories.find()
    for story in mongo_stories:
        if story.get('student_id') in student_map and story.get('course_id') in course_map:
            new_story = models.SuccessStory(
                course_id=course_map[story['course_id']],
                student_id=student_map[story['student_id']],
                title=story.get('title'),
                content=story.get('content'),
                image_urls=story.get('image_urls'),
                published_date=story.get('published_date'),
                is_published=story.get('is_published'),
                created_at=story.get('created_at'),
            )
            db.add(new_story)
    db.commit()
    print("Migrated success stories.")

    # --- 9. MIGRATE VISITS ---
    print("Migrating visits...")
    mongo_visits = mongo_manager.visits.find()
    for visit in mongo_visits:
        new_visit = models.Visit(
            timestamp=visit.get('timestamp'),
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

    # --- 10. MIGRATE CONTACT MESSAGES ---
    print("Migrating contact messages...")
    mongo_messages = mongo_manager.contact_messages.find()
    for msg in mongo_messages:
        new_msg = models.ContactMessage(
            name=msg.get('name'),
            email=msg.get('email'),
            phone=msg.get('phone'),
            message=msg.get('message'),
            is_read=msg.get('is_read'),
            is_resolved=False, # Assuming not resolved
            created_at=msg.get('timestamp'),
        )
        db.add(new_msg)
    db.commit()
    print("Migrated contact messages.")

    # --- 11. MIGRATE CERTIFICATES ---
    print("Migrating certificates...")
    mongo_certificates = mongo_manager.certificates.find()
    for cert in mongo_certificates:
        if cert.get('student_id') in student_map and cert.get('course_id') in course_map:
            new_cert = models.Certificate(
                student_id=student_map[cert['student_id']],
                course_id=course_map[cert['course_id']],
                certificate_number=str(uuid.uuid4()),
                certificate_url=cert.get('certificate_url'),
                issued_date=cert.get('issue_date'),
                is_verified=True, # Assuming all old certificates are verified
                created_at=cert.get('issue_date'),
            )
            db.add(new_cert)
            db.commit()
            db.refresh(new_cert)
            certificate_map[cert['_id']] = new_cert.id
    print("Migrated certificates.")

    # --- 12. MIGRATE ENROLLMENTS ---
    print("Migrating enrollments...")
    # Enrollments are not directly in the old DB, we can create them from registrations
    mongo_registrations = mongo_manager.registrations.find()
    for reg in mongo_registrations:
        if reg.get('student_id') in student_map and reg.get('course_id') in course_map:
            new_enrollment = models.Enrollment(
                student_id=student_map[reg['student_id']],
                course_id=course_map[reg['course_id']],
                status='active' if reg.get('status') == 'confirmed' else 'pending',
                enrolled_date=reg.get('timestamp'),
            )
            db.add(new_enrollment)
    db.commit()
    print("Migrated enrollments from registrations.")


    # --- Close connections ---
    db.close()
    mongo_manager.close_connection()
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate_data()
