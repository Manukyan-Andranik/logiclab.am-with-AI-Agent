import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu, X, ChevronDown, User } from 'lucide-react';
import { getStudentMe } from '@/api/students';
import { getMediaUrl } from '@/api/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function pathBaseAndHash(path: string): { base: string; hashId: string | null } {
  const i = path.indexOf('#');
  if (i === -1) return { base: path, hashId: null };
  let base = path.slice(0, i).replace(/\/+$/, '');
  if (base === '') base = '/';
  return { base, hashId: path.slice(i + 1) };
}

const TraditionalNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const publicNavLinks = [
    { name: 'Գլխավոր', path: '/' },
    { name: 'Դասընթացներ', path: '/courses#all' },
    { name: 'Մեր Մասին', path: '/about' },
    { name: 'Նախագծեր', path: '/#projects' },
    { name: 'Դասախոսներ', path: '/about#instructors' },
    { name: 'Կապ', path: '/#contact' },
  ];

  const accountSubLinks = [
    { name: 'Վահանակ', path: '/student/dashboard' },
    { name: 'Նյութեր', path: '/student/materials' },
    { name: 'Կարգավորումներ', path: '/student/settings' },
    { name: 'Ելք', path: 'logout' },
  ];

  const [studentLoggedIn, setStudentLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    setStudentLoggedIn(Boolean(token && role === 'student'));
  }, [location.pathname]);

  const { data: studentMe } = useQuery({
    queryKey: ['studentMe'],
    queryFn: getStudentMe,
    enabled: studentLoggedIn,
    staleTime: 60_000,
  });

  const profileImageUrl =
    studentMe?.user?.profile_image
      ? getMediaUrl(studentMe.user.profile_image)
      : null;

  const handleStudentLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login?role=student');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-[100] pt-[env(safe-area-inset-top)]">
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-3 flex items-center justify-between py-2">

          <Link to={ '/'}>
            <img src="/logo.png" className="h-10 sm:h-12" />
          </Link>

          <button
            className="lg:hidden text-white"
            onClick={() => setIsOpen(true)}
          >
            <Menu />
          </button>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      <div
        className={`fixed inset-0 bg-[#222] z-[9999] transition-transform lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >

        {/* 🔥 UPDATED MOBILE HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">

          <img src="/logo.png" className="h-10" />

          <div className="flex items-center gap-3">

            {/* USER AVATAR (NEW) */}
            {studentLoggedIn && (
              <div className="h-10 w-10 rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 flex items-center justify-center">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-white/60" />
                )}
              </div>
            )}

            <button onClick={() => setIsOpen(false)} className="text-white">
              <X />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="px-6 py-6 space-y-6">
          {publicNavLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={`block text-xl font-bold uppercase ${
                isActive(link.path)
                  ? 'text-[#FFC000]'
                  : 'text-white hover:text-[#FFD700]'
              }`}
            >
              {link.name}
            </Link>
          ))}

          {!studentLoggedIn ? (
            <div className="pt-6 border-t border-white/10 space-y-4">
              <Link
                to="/login"
                className="block text-xl font-bold uppercase text-white/80"
                onClick={() => setIsOpen(false)}
              >
                Մուտք
              </Link>

              <Link
                to="/register"
                className="block text-xl font-bold uppercase text-[#FFD700]"
                onClick={() => setIsOpen(false)}
              >
                Գրանցվել
              </Link>
            </div>
          ) : (
            <div className="pt-6 border-t border-white/10 space-y-4">
              {accountSubLinks.map((item) =>
                item.name === 'Ելք' ? (
                  <button
                    key={item.name}
                    onClick={() => {
                      handleStudentLogout();
                      setIsOpen(false);
                    }}
                    className="text-xl font-bold uppercase text-white/80"
                  >
                    Ելք
                  </button>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`block text-xl font-bold uppercase ${
                      isActive(item.path)
                        ? 'text-[#FFC000]'
                        : 'text-white'
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TraditionalNavbar;