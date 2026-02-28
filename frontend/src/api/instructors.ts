import { apiClient } from './client';
import { Instructor, Course } from './types';

export const getInstructors = async (): Promise<Instructor[]> => {
  return apiClient<Instructor[]>('/instructors/');
};

export const getInstructor = async (id: number): Promise<Instructor> => {
  return apiClient<Instructor>(`/instructors/${id}`);
};

export const getInstructorCourses = async (id: number): Promise<Course[]> => {
  return apiClient<Course[]>(`/instructors/${id}/courses`);
};

export const createInstructor = async (data: Partial<Instructor>): Promise<Instructor> => {
  return apiClient('/instructors/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateInstructor = async (id: number, data: Partial<Instructor>): Promise<Instructor> => {
  return apiClient(`/instructors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteInstructor = async (id: number): Promise<void> => {
  return apiClient(`/instructors/${id}`, {
    method: 'DELETE',
  });
};
