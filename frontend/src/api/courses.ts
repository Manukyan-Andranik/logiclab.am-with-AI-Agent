import { apiClient } from './client';
import { Course, Chapter, Lesson } from './types';

export const getCourses = async (is_active?: boolean): Promise<Course[]> => {
  const params: Record<string, any> = {};
  if (is_active !== undefined) {
    params.is_active = is_active;
  }
  return apiClient<Course[]>('/courses/', {
    params,
  });
};

export const getCourse = async (id: number): Promise<Course> => {
  return apiClient<Course>(`/courses/${id}`);
};

export const getCourseCurriculum = async (id: number): Promise<any> => {
  return apiClient(`/courses/${id}/curriculum`);
};

export const createCourse = async (data: Partial<Course>): Promise<Course> => {
  return apiClient('/courses/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateCourse = async (id: number, data: Partial<Course>): Promise<Course> => {
  return apiClient(`/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteCourse = async (id: number): Promise<void> => {
  return apiClient(`/courses/${id}`, {
    method: 'DELETE',
  });
};

// Chapter APIs
export const createChapter = async (courseId: number, data: Partial<Chapter>): Promise<Chapter> => {
  return apiClient(`/courses/${courseId}/chapters`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateChapter = async (chapterId: number, data: Partial<Chapter>): Promise<Chapter> => {
  return apiClient(`/courses/chapters/${chapterId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteChapter = async (chapterId: number): Promise<void> => {
  return apiClient(`/courses/chapters/${chapterId}`, {
    method: 'DELETE',
  });
};

// Lesson APIs
export const createLesson = async (chapterId: number, data: Partial<Lesson>): Promise<Lesson> => {
  return apiClient(`/courses/chapters/${chapterId}/lessons`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateLesson = async (lessonId: number, data: Partial<Lesson>): Promise<Lesson> => {
  return apiClient(`/courses/lessons/${lessonId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteLesson = async (lessonId: number): Promise<void> => {
  return apiClient(`/courses/lessons/${lessonId}`, {
    method: 'DELETE',
  });
};
