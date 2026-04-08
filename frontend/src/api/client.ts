export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

type FetchOptions = RequestInit & {
  params?: Record<string, any>;
};

export const apiClient = async <T>(endpoint: string, options: FetchOptions = {}): Promise<T> => {
  const { params, ...fetchOptions } = options;
  
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      // Don't append null or undefined values to search params
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const token = localStorage.getItem('token');
  const headers = new Headers(fetchOptions.headers || {});
  
  // Only set application/json if not sending FormData
  if (!(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.detail || errorData.message || 'API request failed';
    throw new Error(typeof message === 'object' ? JSON.stringify(message) : message);
  }

  // Handle 204 No Content responses (e.g., DELETE operations)
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
};

export const uploadFile = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiClient<{ url: string }>('/upload', {
    method: 'POST',
    body: formData,
    headers: {}, // Explicitly empty headers to let browser set boundary for FormData
  });
};

export const getMediaUrl = (path?: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  // If the path already starts with /api, don't double it
  if (path.startsWith('/api')) return `${BASE_URL.replace('/api', '')}${path}`;
  return `${BASE_URL}${path}`;
};
