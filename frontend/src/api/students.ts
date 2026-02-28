import { apiClient } from './client';
import { Student } from './types';

export const getStudent = async (id: number): Promise<Student> => {
  return apiClient<Student>(`/students/${id}`);
};