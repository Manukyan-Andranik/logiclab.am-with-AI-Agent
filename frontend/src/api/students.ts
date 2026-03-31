import { apiClient } from './client';
import { Student } from './types';

export interface StudentDashboardData {
  student: Student;
  course?: any;
  progress?: {
    total_lessons: number;
    accessed_lessons: number;
    percentage: number;
  };
  materials: Array<{
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
  }>;
}

export const getStudent = async (id: number): Promise<Student> => {
  return apiClient<Student>(`/students/${id}`);
};

export const getStudentMe = async (): Promise<Student> => {
  return apiClient<Student>('/student/me');
};

export const getStudentDashboard = async (): Promise<StudentDashboardData> => {
  return apiClient<StudentDashboardData>('/student/dashboard');
};