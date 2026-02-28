import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronRight } from 'lucide-react';

const TraditionalNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Detect scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const navLinks = [
    { name: 'Գլխավոր', path: '/' },
    { name: 'Դասընթացներ', path: '/courses' },
    { name: 'Մեր Մասին', path: '/about' },
    { name: 'Նախագծեր', path: '/#projects' },
    { name: 'Դասախոսներ', path: '/#instructors' },
    { name: 'Կապ', path: '/#contact' },

  ];

  // Correct public folder path
  const LogicLabLogo = "/logo.png";

  const isActive = (path: string) => {
    if (path.includes('#')) {
      return location.pathname === '/';
    }
    return location.pathname === path;
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        scrolled
          ? 'bg-[var(--black)]/80 backdrop-blur-xl border-b border-[var(--gray-dark)] py-4'
          : 'bg-transparent py-8'
      }`}
    >
      <div className="t-container flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img
            src={LogicLabLogo}
            alt="Logic Lab Logo"
            className={`w-auto transition-all duration-500 ${
              scrolled
                ? 'h-8 md:h-10'
                : 'h-10 md:h-14'
            }`}
          />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-bold uppercase tracking-[0.2em] transition-all hover:text-[var(--primary)] ${
                isActive(link.path)
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--white)]/70'
              }`}
            >
              {link.name}
            </Link>
          ))}

          <Link
            to="/register"
            className="px-6 py-3 rounded-xl bg-[var(--primary)] text-[var(--primary-alt)] text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,215,0,0.2)]"
          >
            Գրանցվել հիմա
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-[var(--white)]"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={32} /> : <Menu size={32} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-[99] bg-[var(--black)] transition-transform duration-500 md:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full p-8 pt-32 space-y-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={`text-4xl font-black uppercase tracking-tighter flex items-center justify-between group ${
                isActive(link.path)
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--white)]'
              }`}
            >
              {link.name}
              <ChevronRight className="group-hover:translate-x-2 transition-transform" />
            </Link>
          ))}

          <Link
            to="/register"
            onClick={() => setIsOpen(false)}
            className="w-full py-6 rounded-2xl bg-[var(--primary)] text-[var(--black)] text-center text-xl font-black uppercase tracking-widest"
          >
            Գրանցվել հիմա
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default TraditionalNavbar;