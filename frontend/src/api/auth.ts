import { apiClient } from './client';
import { LoginResponse } from './types';

export type LoginCredentials = {
  email: string;
  password: string;
  /** Restrict to admin or student account (canonical login field). */
  role?: 'admin' | 'student';
};

/** Canonical login — POST /auth/login (optional role in body). */
export const login = async (data: LoginCredentials): Promise<LoginResponse> => {
  return apiClient<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/** @deprecated Use login({ ..., role: 'student' }) */
export const studentLogin = (data: Omit<LoginCredentials, 'role'>) =>
  login({ ...data, role: 'student' });

export const createStudent = async (data: {
  email: string;
  first_name: string;
  last_name: string;
  course_id: number;
}): Promise<{ student_id: number; temp_password: string }> => {
  return apiClient('/admin/create-student', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/** Canonical public registration — POST /auth/register */
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

export const requestPasswordReset = async (email: string) =>
  apiClient<{ message: string }>("/auth/password-reset-request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const confirmPasswordReset = async (token: string, new_password: string) =>
  apiClient<{ message: string }>("/auth/password-reset-confirm", {
    method: "POST",
    body: JSON.stringify({ token, new_password }),
  });

export const changePassword = async (data: {
  current_password: string;
  new_password: string;
}): Promise<{ message: string }> => {
  return apiClient<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getMe = async (): Promise<Record<string, unknown>> => {
  return apiClient('/students/me');
};
