import { apiClient } from './client';
import { Student } from './types';

export interface CourseMaterial {
  chapter_id: number;
  chapter_title: string;
  chapter_order: number;
  is_accessed: boolean;
  lessons: Array<{
    lesson_id: number;
    lesson_title: string;
    lesson_order: number;
    resource_links: Array<{ name: string; url: string }>;
  }>;
}

export interface CourseProgress {
  total_chapters: number;
  accessed_chapters: number;
  total_lessons: number;
  available_lessons: number;
  accessed_lessons: number;
  percentage: number;
}

export interface EnrolledCourse {
  course_id: number;
  course: {
    id: number;
    title: any;
    slug?: string;
    icon_url?: string;
    duration_months?: number;
  };
  enrollment_id: number | null;
  enrollment_status: string;
  is_completed: boolean;
  certificate_url: string | null;
  progress: CourseProgress;
  materials: CourseMaterial[];
}

export interface StudentDashboardData {
  student: Student;
  courses: EnrolledCourse[];
}

export const getStudent = async (id: number): Promise<Student> => {
  return apiClient<Student>(`/students/${id}`);
};

export const getStudentMe = async (): Promise<Student> => {
  return apiClient<Student>('/student/me');
};

export const updateStudentProfile = async (data: {
  profile_image?: string | null;
}): Promise<Student> => {
  return apiClient<Student>('/student/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const getStudentDashboard = async (): Promise<StudentDashboardData> => {
  return apiClient<StudentDashboardData>('/student/dashboard');
};

export const markChapterAccessed = async (chapterId: number): Promise<any> => {
  return apiClient(`/students/me/materials/chapters/${chapterId}/mark-accessed`, {
    method: 'POST'
  });
};

// ---------------------------------------------------------------------------
// Student-owned projects
// ---------------------------------------------------------------------------
export type Multilingual = { en: string; ru?: string; hy?: string };

export interface MyProject {
  id: number;
  course_id: number;
  student_id: number;
  title: Record<string, string>;
  subtitle?: Record<string, string> | null;
  description: Record<string, string>;
  image_urls: string[];
  links: Record<string, string>;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  course?: { id: number; title: any; slug?: string };
}

export interface CreateMyProjectInput {
  course_id: number;
  title: Multilingual;
  description: Multilingual;
  subtitle?: Multilingual;
  image_urls?: string[];
  links?: Record<string, string>;
}

export const getMyProjects = async (): Promise<MyProject[]> => {
  return apiClient<MyProject[]>('/projects/me');
};

export const createMyProject = async (data: CreateMyProjectInput): Promise<MyProject> => {
  return apiClient<MyProject>('/projects/me', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const uploadMyProjectImage = async (file: File): Promise<{ url: string }> => {
  const fd = new FormData();
  fd.append('file', file);
  return apiClient<{ url: string }>('/projects/me/upload-image', {
    method: 'POST',
    body: fd,
    headers: {}, // browser sets multipart boundary
  });
};