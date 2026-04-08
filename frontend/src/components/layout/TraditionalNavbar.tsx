import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronRight } from 'lucide-react';

const TraditionalNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      if (location.pathname === '/') {
        const sections = ['courses', 'about', 'instructors', 'projects', 'contact'];
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

  // Handle hash-based anchor scrolling
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          window.scrollTo({
            top: element.offsetTop - 80,
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [location.pathname, location.hash]);

  const navLinks = [
    { name: 'Գլխավոր', path: '/' },
    { name: 'Դասընթացներ', path: '/courses' },
    { name: 'Մեր Մասին', path: '/about' },
    { name: 'Նախագծեր', path: '/#projects' },
    { name: 'Դասախոսներ', path: '/about/#instructors' },
    { name: 'Կապ', path: '/#contact' },
  ];

  const isLinkActive = (path: string) => {
    if (location.pathname === '/' && path === '/') return activeSection === '';
    if (location.pathname === '/' && path.includes('#')) {
      return activeSection === path.split('#')[1];
    }
    return location.pathname === path;
  };

  const handleLinkClick = (path: string) => {
    setIsOpen(false);
    
    // Handle anchor scrolling for any path with a hash
    if (path.includes('#')) {
      const sectionId = path.split('#')[1];
      
      // If we're already on the target page, scroll immediately
      if (location.pathname === path.split('#')[0]) {
        const element = document.getElementById(sectionId);
        if (element) {
          setTimeout(() => {
            window.scrollTo({
              top: element.offsetTop - 80,
              behavior: 'smooth'
            });
          }, 100);
        }
      }
      // If navigating to a different page, the scroll will happen in useEffect
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100]">
        {/* Fixed Navbar Background Layer */}
        <div
          className={`absolute inset-0 transition-all duration-500 ${scrolled ? 'bg-[#222]/40 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'
            }`}
        />

        {/* Content Layer */}
        <div
          className={`relative z-10 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4 transition-all duration-500 ${scrolled ? 'py-2' : 'py-2'
            }`}
        >
          <Link to="/" onClick={() => handleLinkClick('/')} className="shrink-0">
            <img src="/logo.png" alt="Logic Lab Logo" className={`w-auto transition-all duration-500 ${scrolled ? 'h-8 md:h-10' : 'h-10 md:h-14'}`} />
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => handleLinkClick(link.path)}
                className={`text-sm font-bold uppercase tracking-[0.2em] transition-all hover:text-[#FFD700] ${isLinkActive(link.path) ? 'text-[#FFC000]' : 'text-white/70'}`}
              >
                {link.name}
              </Link>
            ))}

            <Link to="/register" className="px-6 py-3 rounded-xl bg-[#FFD700] hover:bg-[#FFC000] text-[#222] text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,215,0,0.2)]">
              Գրանցվել
            </Link>

            {/* <Link to="/register" className="px-6 py-3 rounded-xl bg-[#FFD700] text-[#222] text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,215,0,0.2)]">
              Գրանցվել
            </Link> */}
          </div>

          <button className="md:hidden text-white p-2" onClick={() => setIsOpen(true)}>
            <Menu size={32} />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-0 bg-[#222] z-[9999] transition-transform duration-500 md:hidden flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex items-center justify-between p-8 border-b border-white/5">
          <Link to="/" onClick={() => setIsOpen(false)}>
            <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
          </Link>
          <button onClick={() => setIsOpen(false)} className="w-12 h-12 rounded-full bg-white/5 text-white flex items-center justify-center hover:bg-[#FFD700] hover:text-[#222] transition-all">
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pb-32 space-y-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => handleLinkClick(link.path)}
              className={`text-3xl font-black uppercase tracking-tighter flex items-center justify-between group ${isLinkActive(link.path) ? 'text-[#FFC000]' : 'text-white'}`}
            >
              {link.name}
              <ChevronRight size={28} className={`${isLinkActive(link.path) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} text-[#FFC000] transition-all`} />
            </Link>
          ))}
          <Link to="/register" onClick={() => setIsOpen(false)} className="w-full py-5 rounded-2xl bg-[#FFD700] text-[#222] text-center text-xl font-black uppercase tracking-widest block shadow-[0_0_30px_rgba(255,215,0,0.3)]">
            Գրանցվել
          </Link>
        </div>
      </div>
    </>
  );
};

export default TraditionalNavbar;
