import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logicApi, Message } from '../services/logicApi';
import { useT } from '@/i18n';

export const useLogic = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();

  const handleIntent = useCallback((intent: string, courseId?: string | number) => {
    // We use a small timeout to allow React to finish processing the state update
    // from the chat message before starting the navigation transition.
    setTimeout(() => {
      switch (intent) {
        case 'courses':
          navigate('/courses');
          break;
        case 'course_detail':
          if (courseId) {
            navigate(`/courses/${courseId}`);
          } else {
            navigate('/courses');
          }
          break;
        case 'about':
          navigate('/about');
          break;
        case 'register':
          navigate('/register');
          break;
        case 'instructors':
          if (location.pathname === '/about') {
            document.getElementById('instructors')?.scrollIntoView({ behavior: 'smooth' });
          } else {
            navigate('/about#instructors');
          }
          break;
        case 'projects':
          if (location.pathname === '/') {
            document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
          } else {
            navigate('/#projects');
          }
          break;
        case 'success':
          if (location.pathname === '/') {
            document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
          } else {
            navigate('/#projects');
          }
          break;
        case 'contact':
          if (location.pathname === '/') {
            document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
          } else {
            navigate('/#contact');
          }
          break;
        case 'home':
          navigate('/');
          break;
        default:
          break;
      }
    }, 400);
  }, [navigate, location.pathname]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await logicApi.chat(content, messages);
      const assistantMessage: Message = { role: 'assistant', content: response.text };
      setMessages(prev => [...prev, assistantMessage]);

      if (response.intent) {
        handleIntent(response.intent, response.course_id);
      }
    } catch (err) {
      console.error('Logic API Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      const errorMessage: Message = { 
        role: 'assistant', 
        content: t('logic_agent.connection_error')
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, handleIntent, t]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    setMessages
  };
};
