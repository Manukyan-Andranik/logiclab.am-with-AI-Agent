import React, { createContext, useContext, useEffect, useState } from 'react';

export type NavigationMode = 'modern' | 'traditional';

interface NavigationContextType {
  mode: NavigationMode | null;
  selectMode: (mode: NavigationMode) => void;
  resetMode: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<NavigationMode | null>(() => {
    return localStorage.getItem('navigation_mode') as NavigationMode | null;
  });

  const selectMode = (newMode: NavigationMode) => {
    localStorage.setItem('navigation_mode', newMode);
    setMode(newMode);
  };

  const resetMode = () => {
    localStorage.removeItem('navigation_mode');
    setMode(null);
  };

  // Listen for storage events (e.g., from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'navigation_mode') {
        setMode(e.newValue as NavigationMode | null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <NavigationContext.Provider value={{ mode, selectMode, resetMode }}>
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
