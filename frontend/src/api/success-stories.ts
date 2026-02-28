import { apiClient } from './client';
import { SuccessStory } from './types';

export const getSuccessStories = async (params: Record<string, string | number | boolean> = {}): Promise<SuccessStory[]> => {
  return apiClient<SuccessStory[]>('/success-stories/', { params });
};

export const getFeaturedSuccessStories = async (): Promise<SuccessStory[]> => {
  return apiClient<SuccessStory[]>('/success-stories/featured');
};

export const getSuccessStory = async (id: number): Promise<SuccessStory> => {
  return apiClient<SuccessStory>(`/success-stories/${id}`);
};
