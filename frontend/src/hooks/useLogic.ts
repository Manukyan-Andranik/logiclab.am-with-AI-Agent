import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logicApi, Message } from '../services/logicApi';

export const useNexus = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
      setError(err instanceof Error ? err.message : 'An error occurred');
      const errorMessage: Message = { 
        role: 'assistant', 
        content: 'Ցավոք, կապի խնդիր առաջացավ։ Խնդրում եմ փորձեք մի փոքր ուշ։' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, navigate]);

  const handleIntent = (intent: string, courseId?: number) => {
    // Artificial delay for UX feel
    setTimeout(() => {
      switch (intent) {
        case 'courses':
          navigate('/courses');
          break;
        case 'course_detail':
          if (courseId) navigate(`/courses/${courseId}`);
          break;
        case 'about':
          navigate('/about');
          break;
        case 'contact':
          const contactSection = document.getElementById('contact');
          if (contactSection) {
            contactSection.scrollIntoView({ behavior: 'smooth' });
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
    }, 800);
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    setMessages
  };
};
