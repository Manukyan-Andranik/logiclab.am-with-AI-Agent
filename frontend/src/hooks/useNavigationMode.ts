import { useState, useEffect } from 'react';

export type NavigationMode = 'modern' | 'traditional';

export const useNavigationMode = () => {
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

  return { mode, selectMode, resetMode };
};
