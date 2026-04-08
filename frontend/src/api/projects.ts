import { apiClient } from './client';
import { Project } from './types';

export interface ProjectCreate {
  course_id: number;
  student_id: number;
  title: { en: string; ru?: string; hy?: string };
  subtitle?: { en: string; ru?: string; hy?: string };
  description: { en: string; ru?: string; hy?: string };
  image_urls?: string[];
  links?: Record<string, string>;
  is_featured?: boolean;
  is_published?: boolean;
}

export interface ProjectUpdate extends Partial<ProjectCreate> {}

export const getProjects = async (params: Record<string, any> = {}): Promise<Project[]> => {
  return apiClient<Project[]>('/projects/', { params });
};

export const getFeaturedProjects = async (): Promise<Project[]> => {
  return apiClient<Project[]>('/projects/featured');
};

export const getProject = async (id: number): Promise<Project> => {
  return apiClient<Project>(`/projects/${id}`);
};

export const createProject = async (data: ProjectCreate): Promise<Project> => {
  return apiClient<Project>('/projects/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateProject = async (id: number, data: ProjectUpdate): Promise<Project> => {
  return apiClient<Project>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteProject = async (id: number): Promise<void> => {
  await apiClient<void>(`/projects/${id}`, {
    method: 'DELETE',
  });
};

export const toggleProjectPublished = async (id: number): Promise<Project> => {
  return apiClient<Project>(`/projects/${id}/toggle-published`, {
    method: 'PATCH',
  });
};

export const toggleProjectFeatured = async (id: number): Promise<Project> => {
  return apiClient<Project>(`/projects/${id}/toggle-featured`, {
    method: 'PATCH',
  });
};

export const uploadProjectImage = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient<{ url: string }>('/projects/upload-image', {
    method: 'POST',
    body: formData,
    headers: {}, // Let browser set Content-Type for FormData
  });
};

export const getProjectStatistics = async (): Promise<any> => {
  return apiClient<any>('/projects/statistics/overview');
};
