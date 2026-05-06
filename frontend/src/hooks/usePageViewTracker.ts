import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/api/admin';

const EXCLUDED_PREFIXES = ['/admin', '/login', '/student'];

export const usePageViewTracker = () => {
  const location = useLocation();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (EXCLUDED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
      return;
    }

    const key = `${path}${location.search}`;
    if (lastTrackedRef.current === key) return;
    lastTrackedRef.current = key;

    const pageUrl = window.location.href;
    const referrer = document.referrer || null;

    trackPageView(pageUrl, referrer).catch(() => {
      // Swallow tracking errors — visit logging must never break the UI.
    });
  }, [location.pathname, location.search]);
};
