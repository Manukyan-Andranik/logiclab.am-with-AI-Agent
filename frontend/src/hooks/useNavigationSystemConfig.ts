// src/hooks/useNavigationSystemConfig.ts
import { useEffect, useState } from 'react';

export type NavigationSystemType = 'AGENT' | 'TRADITIONAL';

interface NavigationConfig {
  navigation_system: NavigationSystemType;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Hook to fetch and cache the navigation system configuration from the backend.
 * Falls back to env var if backend is unreachable.
 */
export const useNavigationSystemConfig = () => {
  const [navigationSystem, setNavigationSystem] = useState<NavigationSystemType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // Try to fetch from backend API
        const response = await fetch(`${API_URL}/config/navigation`, {
          method: 'GET',
          headers: {},
        });

        if (response.ok) {
          const data: NavigationConfig = await response.json();
          setNavigationSystem(data.navigation_system);
          setError(null);
        } else {
          throw new Error(`Backend returned status ${response.status}`);
        }
      } catch (err) {
        // Fallback to environment variable if backend is unreachable
        console.warn('Failed to fetch navigation config from backend, using env var:', err);
        const envValue = import.meta.env.VITE_NAVIGATION_SYSTEM as NavigationSystemType || 'AGENT';
        setNavigationSystem(envValue);
        setError(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return {
    navigationSystem,
    isLoading,
    error,
    isAgentEnabled: navigationSystem === 'AGENT',
    isTraditionalEnabled: navigationSystem === 'TRADITIONAL',
  };
};
