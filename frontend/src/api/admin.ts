import { apiClient } from './client';

export const getDashboardStats = async (): Promise<Record<string, any>> => {
  return apiClient('/admin/dashboard');
};

export const getRegistrations = async (params: Record<string, string | number | boolean> = {}): Promise<any> => {
  return apiClient('/admin/registrations', { params });
};

export const updateRegistrationStatus = async (id: number, status: string): Promise<void> => {
  return apiClient(`/admin/registrations/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
};

export const getAdminStudents = async (): Promise<any[]> => {
  return apiClient('/admin/students');
};

export const getVisitStatsSummary = async (): Promise<Record<string, any>> => {
  return apiClient('/visits/stats/summary');
};

// Student Progress management
export const updateStudentProgress = async (studentId: number, data: { chapter_id?: number, lesson_id?: number }): Promise<void> => {
  const params: Record<string, any> = {};
  if (data.chapter_id) params.chapter_id = data.chapter_id;
  if (data.lesson_id) params.lesson_id = data.lesson_id;
  
  return apiClient(`/admin/students/${studentId}/progress`, {
    method: 'PATCH',
    params
  });
};

export const assignChapterToStudent = async (studentId: number, chapterId: number): Promise<void> => {
  return apiClient(`/admin/students/${studentId}/materials/chapters/${chapterId}/mark-accessed`, {
    method: 'POST'
  });
};
