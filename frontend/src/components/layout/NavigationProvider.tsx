import React, { createContext, useContext, useEffect, useState } from 'react';

export type NavigationMode = 'modern' | 'traditional';
export type NavigationSystemType = 'AGENT' | 'TRADITIONAL';

interface NavigationContextType {
  mode: NavigationMode | null;
  selectMode: (mode: NavigationMode) => void;
  resetMode: () => void;
  navigationSystem: NavigationSystemType | null;
  isConfigLoading: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<NavigationMode | null>(() => {
    const stored = localStorage.getItem('navigation_mode') as NavigationMode | null;
    return stored;
  });

  const [navigationSystem, setNavigationSystem] = useState<NavigationSystemType | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  // Fetch navigation system config from backend on mount
  useEffect(() => {
    const fetchNavigationSystemConfig = async () => {
      try {
        const response = await fetch(`${API_URL}/config/navigation`, {
          method: 'GET',
          headers: {},
        });

        if (response.ok) {
          const data: { navigation_system: NavigationSystemType } = await response.json();
          setNavigationSystem(data.navigation_system);

          // If navigationSystem is AGENT and no mode is selected, set default to modern
          if (data.navigation_system === 'AGENT' && !mode) {
            setMode('modern');
          }
          // If navigationSystem is TRADITIONAL, always set mode to traditional
          else if (data.navigation_system === 'TRADITIONAL') {
            setMode('traditional');
          }
        } else {
          // Fallback to env var
          const envValue = (import.meta.env.VITE_NAVIGATION_SYSTEM || 'AGENT') as NavigationSystemType;
          setNavigationSystem(envValue);
          if (envValue === 'TRADITIONAL') {
            setMode('traditional');
          }
        }
      } catch (err) {
        console.warn('Failed to fetch navigation system config:', err);
        // Fallback to env var
        const envValue = (import.meta.env.VITE_NAVIGATION_SYSTEM || 'AGENT') as NavigationSystemType;
        setNavigationSystem(envValue);
        if (envValue === 'TRADITIONAL') {
          setMode('traditional');
        }
      } finally {
        setIsConfigLoading(false);
      }
    };

    fetchNavigationSystemConfig();
  }, []);

  const selectMode = (newMode: NavigationMode) => {
    // If in TRADITIONAL mode, don't allow switching
    if (navigationSystem === 'TRADITIONAL') {
      return;
    }
    localStorage.setItem('navigation_mode', newMode);
    setMode(newMode);
  };

  const resetMode = () => {
    localStorage.removeItem('navigation_mode');
    // Reset to default based on navigationSystem
    if (navigationSystem === 'AGENT') {
      setMode('modern');
    } else {
      setMode('traditional');
    }
  };

  // Listen for storage events (e.g., from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'navigation_mode') {
        const newValue = e.newValue as NavigationMode | null;
        if (navigationSystem === 'TRADITIONAL') {
          // Don't allow switching in traditional mode
          return;
        }
        setMode(newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigationSystem]);

  return (
    <NavigationContext.Provider value={{ mode, selectMode, resetMode, navigationSystem, isConfigLoading }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationContext = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigationContext must be used within a NavigationProvider');
  }
  return context;
};
