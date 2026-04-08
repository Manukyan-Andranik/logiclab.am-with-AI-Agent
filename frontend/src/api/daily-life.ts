import { apiClient } from './client';
import { DailyLife, LocalizedText } from './types';

// Public endpoints
export const getDailyLife = async (params: Record<string, string | number | boolean> = {}): Promise<DailyLife[]> => {
  return apiClient<DailyLife[]>('/daily-life/', { params });
};

export const getFeaturedDailyLife = async (): Promise<DailyLife[]> => {
  return apiClient<DailyLife[]>('/daily-life/featured');
};

export const getDailyLifeStory = async (id: number): Promise<DailyLife> => {
  return apiClient<DailyLife>(`/daily-life/${id}`);
};

// Admin endpoints for Daily Life section
export interface ListDailyLifeParams {
  skip?: number;
  limit?: number;
  is_published?: boolean | null;
}

export const listAllDailyLife = async (params: ListDailyLifeParams = {}): Promise<DailyLife[]> => {
  return apiClient<DailyLife[]>('/daily-life/admin/list', { params });
};

export const createDailyLife = async (data: {
  title: LocalizedText;
  subtitle?: LocalizedText;
  description: LocalizedText;
  image_urls?: string[];
  video_url?: string;
  is_published?: boolean;
}): Promise<DailyLife> => {
  return apiClient<DailyLife>('/daily-life/', { 
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateDailyLife = async (
  storyId: number,
  data: {
    title?: LocalizedText;
    subtitle?: LocalizedText;
    description?: LocalizedText;
    image_urls?: string[];
    video_url?: string;
    is_published?: boolean;
  }
): Promise<DailyLife> => {
  return apiClient<DailyLife>(`/daily-life/${storyId}`, { 
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const deleteDailyLife = async (storyId: number): Promise<void> => {
  return apiClient<void>(`/daily-life/${storyId}`, { 
    method: 'DELETE'
  });
};

export const toggleDailyLifePublished = async (storyId: number): Promise<DailyLife> => {
  return apiClient<DailyLife>(`/daily-life/${storyId}/toggle-published`, { 
    method: 'PATCH'
  });
};
