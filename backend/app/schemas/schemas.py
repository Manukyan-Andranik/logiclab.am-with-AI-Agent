from pydantic import BaseModel, EmailStr, Field, field_validator, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    STUDENT = "student"
    INSTRUCTOR = "instructor"

class RegistrationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    REJECTED = "rejected"

class EnrollmentStatusEnum(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    DROPPED = "dropped"

# Multilingual Text
class MultilingualText(BaseModel):
    en: Optional[str] = None
    ru: Optional[str] = None
    hy: Optional[str] = None

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: UserRole

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class StudentSelfProfileUpdate(BaseModel):
    profile_image: Optional[str] = Field(None, max_length=500)


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: Optional[str] = None
    course_id: Optional[int] = None
    message: Optional[str] = None

# User Personal Schemas
class UserPersonalBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    social_links: Optional[Dict[str, str]] = {}
    country: Optional[str] = None
    city: Optional[str] = None

class UserPersonalCreate(UserPersonalBase):
    password: str
    role: UserRole

class UserPersonalUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    country: Optional[str] = None
    city: Optional[str] = None

class UserPersonalResponse(UserPersonalBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    @field_validator("social_links", mode="before")
    @classmethod
    def coerce_social_links(cls, v: Any) -> Dict[str, str]:
        if isinstance(v, dict):
            out: Dict[str, str] = {}
            for k, val in v.items():
                out[str(k)] = "" if val is None else str(val)
            return out
        return {}

    class Config:
        from_attributes = True

# Student Schemas
class StudentBase(BaseModel):
    course_id: Optional[int] = None
    # ORM `students.status` column uses RegistrationStatus (not a separate StudentStatus enum).
    status: Optional[RegistrationStatus] = None
    created_at: Optional[datetime] = None

class StudentResponse(StudentBase):
    id: int
    user_id: int
    course_id: Optional[int] = None
    last_chapter_id: Optional[int] = None
    last_lesson_id: Optional[int] = None
    user: UserPersonalResponse
    
    class Config:
        from_attributes = True


class StudentAdminCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    course_id: int

# Instructor Schemas
class InstructorBase(BaseModel):
    bio: Optional[str] = None
    skills: Optional[List[str]] = []
    proficiency: Optional[List[str]] = []

class InstructorResponse(InstructorBase):
    id: int
    user_id: int
    is_active: bool
    user: UserPersonalResponse
    
    class Config:
        from_attributes = True


class CourseResponse(BaseModel):
    id: int
    slug: Optional[str] = None
    title: Dict[str, str]
    description: Dict[str, str]
    curriculum_url: Optional[str]
    order_index: Optional[int]
    hero_video_url: Optional[str]
    curriculum: Optional[Dict[str, List[str]]]

    icon_url: Optional[str]
    duration_months: Optional[int]
    start_date: Optional[datetime]
    schedule: Optional[Dict[str, str]]
    monthly_payment: Optional[float]
    total_payment: Optional[float]
    is_active: bool
    created_at: datetime
    instructors: Optional[List[InstructorResponse]] = []
    
    class Config:
        from_attributes = True

class StudentDashboardResponse(BaseModel):
    student: StudentResponse
    course: Optional[CourseResponse] = None
    progress: Optional[Dict[str, Any]] = None
    materials: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

class StudentCreate(StudentBase):
    user_id: int
    course_id: Optional[int] = None

class StudentUpdate(StudentBase, UserPersonalBase):
    last_chapter_id: Optional[int] = None
    last_lesson_id: Optional[int] = None
    is_active: Optional[bool] = None




class InstructorCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    bio: Optional[str] = None
    skills: Optional[List[str]] = []
    proficiency: Optional[List[str]] = []
    profile_image: Optional[str] = None
    social_links: Optional[Dict[str, str]] = {}

class InstructorUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    proficiency: Optional[List[str]] = None
    profile_image: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    is_active: Optional[bool] = None


# Course Schemas
class CourseBase(BaseModel):
    slug: Optional[str] = None
    title: MultilingualText
    description: MultilingualText
    curriculum_url: Optional[str] = None
    order_index: Optional[int] = 0
    curriculum: Optional[Dict[str, List[str]]] = {}
    icon_url: Optional[str] = None
    hero_video_url: Optional[str] = None
    duration_months: Optional[int] = None
    start_date: Optional[datetime] = None
    schedule: Optional[Dict[str, str]] = None
    monthly_payment: Optional[float] = None
    total_payment: Optional[float] = None




class CourseCreate(CourseBase):
    curriculum: Optional[Dict[str, List[str]]] = {}
    instructor_ids: Optional[List[int]] = []
    is_active: Optional[bool] = True

class CourseUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[MultilingualText] = None
    description: Optional[MultilingualText] = None
    curriculum_url: Optional[str] = None
    order_index: Optional[int] = None
    curriculum: Optional[Dict[str, List[str]]] = {}

    icon_url: Optional[str] = None
    hero_video_url: Optional[str] = None
    duration_months: Optional[int] = None
    start_date: Optional[datetime] = None
    schedule: Optional[Dict[str, str]] = None
    monthly_payment: Optional[float] = None
    total_payment: Optional[float] = None
    is_active: Optional[bool] = None
    instructor_ids: Optional[List[int]] = None


# Chapter Schemas
class ChapterBase(BaseModel):
    title: str
    order_index: int

class ChapterCreate(ChapterBase):
    pass

class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    order_index: Optional[int] = None

class ChapterResponse(BaseModel):
    id: int
    course_id: int
    title: str
    order_index: int
    created_at: datetime
    lessons: Optional[List['LessonResponse']] = []
    
    class Config:
        from_attributes = True

# Lesson Schemas
class LessonBase(BaseModel):
    title: str
    order_index: int
    resource_links: Optional[List[Dict[str, str]]] = []

class LessonCreate(LessonBase):
    pass

class LessonUpdate(BaseModel):
    title: Optional[str] = None
    order_index: Optional[int] = None
    resource_links: Optional[List[Dict[str, str]]] = None

class LessonResponse(BaseModel):
    id: int
    chapter_id: int
    title: str
    order_index: int
    resource_links: List[Dict[str, str]]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Registration Schemas
class RegistrationCreate(BaseModel):
    course_id: int
    message: Optional[str] = None
    first_name: str
    last_name: str
    email: EmailStr
    password: str

class RegistrationUpdate(BaseModel):
    status: RegistrationStatus

class RegistrationResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    status: RegistrationStatus
    message: Optional[str]
    registration_date: datetime
    student: StudentResponse
    course: CourseResponse
    
    class Config:
        from_attributes = True

# Material Access Schemas (material = chapter of course)




class RegistrationListResponse(BaseModel):
    data: List[RegistrationResponse]
    total: int

# Visit Schemas
class VisitBase(BaseModel):
    ip_address: str
    page_url: str
    user_agent: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    referrer: Optional[str] = None
    is_bot: Optional[bool] = False

class VisitCreate(VisitBase):
    pass

class VisitResponse(VisitBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class VisitAggregationItem(BaseModel):
    label: str # e.g., date, page_url, country, browser
    count: int

class VisitSummaryResponse(BaseModel):
    total_visits: int
    unique_visitors: int
    mobile_visits: int
    desktop_visits: int
    bot_visits: int
    human_visits: int
    visits_over_time: List[VisitAggregationItem]
    visits_by_page: List[VisitAggregationItem]
    visits_by_country: List[VisitAggregationItem]
    visits_by_browser: List[VisitAggregationItem]

class VisitListResponse(BaseModel):
    data: List[VisitResponse]
    total: int

# Contact Message Schemas
class ContactMessageBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    is_read: bool = False
    is_resolved: bool = False

class ContactMessageCreate(ContactMessageBase):
    pass

class ContactMessageUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_resolved: Optional[bool] = None

class ContactMessageResponse(ContactMessageBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ContactMessageListResponse(BaseModel):
    data: List[ContactMessageResponse]
    total: int

# Certificate Schemas
class CertificateBase(BaseModel):
    student_id: int
    course_id: int
    certificate_number: str
    certificate_url: Optional[str] = None
    issued_date: Optional[datetime] = None
    is_verified: bool = False

class CertificateCreate(CertificateBase):
    pass

class CertificateUpdate(BaseModel):
    certificate_url: Optional[str] = None
    is_verified: Optional[bool] = None

class CertificateResponse(CertificateBase):
    id: int
    created_at: datetime
    
    student: StudentResponse # Include student details
    course: CourseResponse # Include course details

    class Config:
        from_attributes = True

class CertificateListResponse(BaseModel):
    data: List[CertificateResponse]
    total: int

# Enrollment Schemas
class EnrollmentBase(BaseModel):
    student_id: int
    course_id: int
    status: EnrollmentStatusEnum = EnrollmentStatusEnum.PENDING
    progress: int = 0
    enrolled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    is_completed: bool = False
    certificate_id: Optional[int] = None

class EnrollmentCreate(EnrollmentBase):
    pass

class EnrollmentUpdate(BaseModel):
    status: Optional[EnrollmentStatusEnum] = None
    progress: Optional[int] = None
    completed_date: Optional[datetime] = None
    is_completed: Optional[bool] = None
    certificate_id: Optional[int] = None

class EnrollmentResponse(EnrollmentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    student: StudentResponse # Include student details
    course: CourseResponse # Include course details
    certificate: Optional[CertificateResponse] = None # Include certificate details

    class Config:
        from_attributes = True

class EnrollmentListResponse(BaseModel):
    data: List[EnrollmentResponse]
    total: int


# Project Schemas
class ProjectBase(BaseModel):
    title: MultilingualText
    subtitle: Optional[MultilingualText] = None
    description: MultilingualText
    image_urls: Optional[List[str]] = []
    links: Optional[Dict[str, str]] = {}

class ProjectCreate(ProjectBase):
    course_id: int
    student_id: int
    is_featured: Optional[bool] = False
    is_published: Optional[bool] = False

class ProjectUpdate(BaseModel):
    title: Optional[MultilingualText] = None
    subtitle: Optional[MultilingualText] = None
    description: Optional[MultilingualText] = None
    image_urls: Optional[List[str]] = None
    links: Optional[Dict[str, str]] = None
    is_featured: Optional[bool] = None
    is_published: Optional[bool] = None

class ProjectResponse(BaseModel):
    id: int
    course_id: int
    student_id: int
    title: Dict[str, str]
    subtitle: Optional[Dict[str, str]] = None
    description: Dict[str, str]
    image_urls: List[str]
    links: Dict[str, str]
    is_featured: bool
    is_published: bool
    created_at: datetime
    student: StudentResponse
    course: CourseResponse
    
    class Config:
        from_attributes = True

# Daily Life Schemas
class DailyLifeBase(BaseModel):
    title: MultilingualText
    subtitle: Optional[MultilingualText] = None
    description: MultilingualText
    image_urls: Optional[List[str]] = []
    video_url: Optional[str] = None

class DailyLifeCreate(DailyLifeBase):
    is_published: Optional[bool] = False

class DailyLifeUpdate(BaseModel):
    title: Optional[MultilingualText] = None
    subtitle: Optional[MultilingualText] = None
    description: Optional[MultilingualText] = None
    image_urls: Optional[List[str]] = None
    video_url: Optional[str] = None
    is_published: Optional[bool] = None

class DailyLifeResponse(BaseModel):
    id: int
    title: Dict[str, str]
    subtitle: Optional[Dict[str, str]] = None
    description: Dict[str, str]
    image_urls: List[str]
    video_url: Optional[str] = None
    published_date: datetime
    is_published: bool
    created_at: datetime

    @field_validator("title", "description", mode="before")
    @classmethod
    def _coerce_i18n_dict(cls, v: Any) -> Dict[str, str]:
        if v is None:
            return {}
        if isinstance(v, str):
            return {"en": v}
        if isinstance(v, dict):
            return {str(k): "" if val is None else str(val) for k, val in v.items()}
        return {}

    @field_validator("subtitle", mode="before")
    @classmethod
    def _coerce_subtitle(cls, v: Any) -> Optional[Dict[str, str]]:
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return {"en": s} if s else None
        if isinstance(v, dict):
            out = {str(k): "" if val is None else str(val) for k, val in v.items()}
            return out or None
        return None

    @field_validator("image_urls", mode="before")
    @classmethod
    def _coerce_image_urls(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [v] if v.strip() else []
        if isinstance(v, list):
            return [str(x) for x in v if x is not None and str(x).strip()]
        if isinstance(v, dict):
            return [str(x) for x in v.values() if x is not None and str(x).strip()]
        return []

    @field_validator("published_date", "created_at", mode="before")
    @classmethod
    def _coerce_datetimes(cls, v: Any) -> datetime:
        if v is None:
            return datetime.utcnow()
        return v

    class Config:
        from_attributes = True
# Material Schemas
class MaterialLink(BaseModel):
    name: str
    url: str

    @validator("url")
    def validate_url(cls, v: str) -> str:
        # Basic URL validation to ensure proper format and protocol
        if not v:
            raise ValueError("URL is required")
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return v

class MaterialBase(BaseModel):
    chapter_id: int
    lesson_id: int
    links: List[MaterialLink] = []

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    links: Optional[List[MaterialLink]] = None

class MaterialResponse(MaterialBase):
    id: int
    links: List[MaterialLink] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Updated Material Access Schemas
class MaterialAccessCreate(BaseModel):
    student_id: int
    chapter_id: Optional[int] = None
    lesson_id: Optional[int] = None

class MaterialAccessResponse(BaseModel):
    id: int
    granted_at: datetime
    accessed_at: Optional[datetime] = None
    student_id: int
    chapter_id: Optional[int] = None
    lesson_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class MaterialAccessListResponse(BaseModel):
    data: List[MaterialAccessResponse]
    total: int
