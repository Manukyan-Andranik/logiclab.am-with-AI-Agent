import { BASE_URL } from '@/api/client';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  history: Message[];
}

export interface ChatResponse {
  text: string;
  intent: string;
  course_id?: number;
  learning_path?: string[];
}

// Logic API is under the main API prefix
const API_BASE_URL = BASE_URL;

export const logicApi = {
  chat: async (message: string, history: Message[]): Promise<ChatResponse> => {
    const response = await fetch(`${API_BASE_URL}/logic/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) {
      throw new Error('Failed to communicate with Logic');
    }

    return response.json();
  }
};
