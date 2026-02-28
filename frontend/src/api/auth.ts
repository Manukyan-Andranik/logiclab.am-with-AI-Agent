import { apiClient } from './client';
import { LoginResponse } from './types';

export const login = async (data: Record<string, string>): Promise<LoginResponse> => {
  return apiClient<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const registerStudent = async (data: Record<string, string | number>): Promise<void> => {
  return apiClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const registerInstructor = async (data: Record<string, string | number | string[]>): Promise<void> => {
  return apiClient('/auth/instructor/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getMe = async (): Promise<Record<string, unknown>> => {
  return apiClient('/students/me');
};
