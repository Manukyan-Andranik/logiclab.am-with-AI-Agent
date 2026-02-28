import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--black)] text-[var(--white)]">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-[var(--primary)]">404</h1>
        <p className="mb-4 text-xl text-[var(--gray-light)] opacity-70">Oops! Page not found</p>
        <a href="/" className="text-[var(--primary)] underline hover:text-[var(--white)] transition-colors">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
