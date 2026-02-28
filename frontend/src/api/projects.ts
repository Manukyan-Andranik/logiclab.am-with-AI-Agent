import { apiClient } from './client';
import { Project } from './types';

export const getProjects = async (params: Record<string, string | number | boolean> = {}): Promise<Project[]> => {
  return apiClient<Project[]>('/projects/', { params });
};

export const getFeaturedProjects = async (): Promise<Project[]> => {
  return apiClient<Project[]>('/projects/featured');
};

export const getProject = async (id: number): Promise<Project> => {
  return apiClient<Project>(`/projects/${id}`);
};
