import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronRight, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Normalize "pathname#hash" from Link `to` (handles `/courses/#x` vs `/courses#x`). */
function pathBaseAndHash(path: string): { base: string; hashId: string | null } {
  const i = path.indexOf('#');
  if (i === -1) return { base: path, hashId: null };
  let base = path.slice(0, i).replace(/\/+$/, '');
  if (base === '') base = '/';
  return { base, hashId: path.slice(i + 1) };
}

const TraditionalNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      if (location.pathname === '/') {
        const sections = ['daily-life', 'courses', 'about', 'projects', 'contact'];
        const scrollPosition = window.scrollY + 100;

        for (const sectionId of sections) {
          const element = document.getElementById(sectionId);
          if (element) {
            const offsetTop = element.offsetTop;
            const offsetHeight = element.offsetHeight;
            if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
              setActiveSection(sectionId);
              break;
            } else if (scrollPosition < 500) {
              setActiveSection('');
            }
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  const navLinks = [
    { name: 'Գլխավոր', path: '/' },
    { name: 'Դասընթացներ', path: '/courses#all' },
    { name: 'Մեր Մասին', path: '/about' },
    { name: 'Նախագծեր', path: '/#projects' },
    { name: 'Դասախոսներ', path: '/about#instructors' },
    { name: 'Կապ', path: '/#contact' },
  ];

  const isLinkActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' && activeSection === '';
    }
    const { base, hashId } = pathBaseAndHash(path);
    if (hashId) {
      if (location.pathname !== base) return false;
      if (base === '/') {
        return activeSection === hashId || location.hash === `#${hashId}`;
      }
      return location.hash === `#${hashId}`;
    }
    return location.pathname === path;
  };

  const loginRouteActive = location.pathname === '/login';
  const studentDashboardActive = location.pathname.startsWith('/student');
  const [studentLoggedIn, setStudentLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    setStudentLoggedIn(Boolean(token && role === 'student'));
  }, [location.pathname]);

  const handleLinkClick = (path: string) => {
    setIsOpen(false);

    const { base, hashId } = pathBaseAndHash(path);
    if (hashId && location.pathname === base) {
      const element = document.getElementById(hashId);
      if (element) {
        setTimeout(() => {
          window.scrollTo({
            top: element.offsetTop - 80,
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100] pt-[env(safe-area-inset-top)]">
        {/* Fixed Navbar Background Layer */}
        <div
          className={`absolute inset-0 transition-all duration-500 ${scrolled ? 'bg-[#222]/40 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'
            }`}
        />

        {/* Content Layer */}
        <div
          className={`relative z-10 w-full max-w-[1400px] mx-auto min-w-0 px-3 sm:px-6 lg:px-10 flex items-center justify-between gap-2 sm:gap-4 transition-all duration-500 py-2`}
        >
          <Link to="/" onClick={() => handleLinkClick('/')} className="shrink-0 min-w-0">
            <img
              src="/logo.png"
              alt="Logic Lab Logo"
              className={`w-auto max-w-[min(11rem,46vw)] object-contain object-left transition-all duration-500 ${scrolled ? 'h-7 sm:h-8 lg:h-10' : 'h-9 sm:h-10 lg:h-14'}`}
            />
          </Link>

          <div className="hidden min-w-0 lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-3 xl:gap-6 2xl:gap-10 lg:pl-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => handleLinkClick(link.path)}
                className={`shrink-0 whitespace-nowrap text-[10px] xl:text-xs 2xl:text-sm font-bold uppercase tracking-wide 2xl:tracking-[0.2em] transition-all hover:text-[#FFD700] ${isLinkActive(link.path) ? 'text-[#FFC000]' : 'text-white/70'}`}
              >
                {link.name}
              </Link>
            ))}

            {studentLoggedIn ? (
              <Link
                to="/student/dashboard"
                className={`shrink-0 whitespace-nowrap text-[10px] xl:text-xs 2xl:text-sm font-bold uppercase tracking-wide 2xl:tracking-[0.2em] transition-all hover:text-[#FFD700] ${
                  studentDashboardActive ? 'text-[#FFC000]' : 'text-white/70'
                }`}
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className={`shrink-0 whitespace-nowrap text-[10px] xl:text-xs 2xl:text-sm font-bold uppercase tracking-wide 2xl:tracking-[0.2em] transition-all hover:text-[#FFD700] ${
                  loginRouteActive ? 'text-[#FFC000]' : 'text-white/70'
                }`}
              >
                Մուտք
              </Link>
            )}

            <Link
              to="/register"
              className="shrink-0 whitespace-nowrap px-3 py-2 rounded-xl xl:px-5 xl:py-2.5 2xl:px-6 2xl:py-3 bg-[#FFD700] hover:bg-[#FFC000] text-[#222] text-[10px] xl:text-xs 2xl:text-sm font-black uppercase tracking-wide 2xl:tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,215,0,0.2)]"
            >
              Գրանցվել
            </Link>
          </div>

          <button
            type="button"
            aria-label="Բացել ընտրացանկը"
            className="lg:hidden shrink-0 text-white p-2 -mr-1 sm:mr-0 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setIsOpen(true)}
          >
            <Menu className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={2} />
          </button>
        </div>
      </nav>

      {/* Mobile + tablet: drawer until lg breakpoint */}
      <div
        className={`fixed inset-0 bg-[#222] z-[9999] transition-transform duration-500 ease-out lg:hidden flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-8 py-4 sm:py-6 border-b border-white/5 shrink-0">
          <Link to="/" onClick={() => setIsOpen(false)} className="min-w-0">
            <img src="/logo.png" alt="Logo" className="h-9 sm:h-10 w-auto max-w-[min(10rem,50vw)] object-contain object-left" />
          </Link>
          <button
            type="button"
            aria-label="Փակել ընտրացանկը"
            onClick={() => setIsOpen(false)}
            className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/5 text-white flex items-center justify-center hover:bg-[#FFD700] hover:text-[#222] transition-all touch-manipulation"
          >
            <X className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-8 py-6 sm:py-8 pb-[max(2rem,env(safe-area-inset-bottom))] space-y-6 sm:space-y-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => handleLinkClick(link.path)}
              className={`text-2xl sm:text-3xl font-black uppercase tracking-tighter flex items-center justify-between gap-4 group ${isLinkActive(link.path) ? 'text-[#FFC000]' : 'text-white'}`}
            >
              <span className="min-w-0 break-words">{link.name}</span>
              <ChevronRight className={`shrink-0 w-6 h-6 sm:w-7 sm:h-7 ${isLinkActive(link.path) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} text-[#FFC000] transition-all`} strokeWidth={2} />
            </Link>
          ))}
          {studentLoggedIn ? (
            <Link
              to="/student/dashboard"
              onClick={() => setIsOpen(false)}
              className={`text-2xl sm:text-3xl font-black uppercase tracking-tighter flex items-center justify-between gap-4 group border-t border-white/5 pt-6 sm:pt-8 ${studentDashboardActive ? 'text-[#FFC000]' : 'text-white'}`}
            >
              <span className="min-w-0 break-words">Dashboard</span>
              <ChevronRight className={`shrink-0 w-6 h-6 sm:w-7 sm:h-7 ${studentDashboardActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} text-[#FFC000] transition-all`} strokeWidth={2} />
            </Link>
          ) : (
            <details className="group/login border-t border-white/5 pt-6 sm:pt-8">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-2xl font-black uppercase tracking-tighter text-white [&::-webkit-details-marker]:hidden">
                <span className={loginRouteActive ? 'text-[#FFC000]' : ''}>Մուտք</span>
                <ChevronDown className="h-6 w-6 shrink-0 text-[#FFC000] transition-transform group-open/login:rotate-180" aria-hidden />
              </summary>
              <div className="mt-4 flex flex-col gap-3 border-l-2 border-[#FFC000]/30 pl-4">
                <Link
                  to="/login?role=admin"
                  onClick={() => setIsOpen(false)}
                  className="text-base font-bold uppercase tracking-widest text-white/80 hover:text-[#FFD700] transition-colors"
                >
                  admin
                </Link>
                <Link
                  to="/login?role=student"
                  onClick={() => setIsOpen(false)}
                  className="text-base font-bold uppercase tracking-widest text-white/80 hover:text-[#FFD700] transition-colors"
                >
                  student
                </Link>
              </div>
            </details>
          )}
          <Link
            to="/register"
            onClick={() => setIsOpen(false)}
            className="w-full py-4 sm:py-5 rounded-2xl bg-[#FFD700] text-[#222] text-center text-lg sm:text-xl font-black uppercase tracking-widest block shadow-[0_0_30px_rgba(255,215,0,0.3)] touch-manipulation"
          >
            Գրանցվել
          </Link>
        </div>
      </div>
    </>
  );
};

export default TraditionalNavbar;
