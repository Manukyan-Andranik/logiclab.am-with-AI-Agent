import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useT } from "@/i18n";

const NotFound = () => {
  const location = useLocation();
  const t = useT();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-primary">404</h1>
        <p className="mb-4 text-xl text-[var(--gray-light)] opacity-70">{t('not_found.heading')}</p>
        <p className="mb-4 text-sm text-[var(--gray-light)] opacity-50">{t('not_found.body')}</p>
        <a href="/" className="text-primary underline hover:text-white transition-colors">
          {t('not_found.cta_home')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
