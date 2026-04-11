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

type AccountMenuEntry =
  | { kind: 'route'; name: string; path: string }
  | { kind: 'logout'; name: string };

const ACCOUNT_MENU: readonly AccountMenuEntry[] = [
  { kind: 'route', name: 'Վահանակ', path: '/student/dashboard' },
  { kind: 'route', name: 'Նյութեր', path: '/student/materials' },
  { kind: 'route', name: 'Կարգավորումներ', path: '/student/settings' },
  { kind: 'logout', name: 'Դուրս գալ' },
];

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

  const isActive = (path: string) => {
    const { base, hashId } = pathBaseAndHash(path);
    if (hashId) {
      if (location.pathname !== base) return false;
      return location.hash === `#${hashId}`;
    }
    return location.pathname === path;
  };

  const isStudentRouteActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-[100] pt-[env(safe-area-inset-top)] bg-[#222]/30 backdrop-blur-md border-b border-white/5">
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-10 flex items-center justify-between gap-4 py-2">
          <Link
            to={studentLoggedIn ? '/student/dashboard' : '/'}
            className="shrink-0 min-w-0"
            onClick={() => setIsOpen(false)}
          >
            <img src="/logo.png" alt="Logic Lab" className="h-10 sm:h-12 w-auto max-w-[min(11rem,46vw)] object-contain object-left" />
          </Link>

          {/* Desktop: public links + account / auth */}
          <div className="hidden min-w-0 lg:flex lg:flex-1 lg:items-center lg:justify-end lg:gap-4 xl:gap-6 2xl:gap-8 lg:pl-4">
            {publicNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`shrink-0 whitespace-nowrap text-[10px] xl:text-xs 2xl:text-sm font-bold uppercase tracking-wide 2xl:tracking-[0.2em] transition-colors hover:text-[#FFD700] ${
                  isActive(link.path) ? 'text-[#FFC000]' : 'text-white/70'
                }`}
              >
                {link.name}
              </Link>
            ))}

            {studentLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  type="button"
                  className="shrink-0 flex items-center gap-2 rounded-xl border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#FFC000]/50"
                >
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/40 ring-1 ring-white/10">
                    {profileImageUrl ? (
                      <img src={profileImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-white/50" strokeWidth={2} />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col items-start leading-tight">
                    <span className="max-w-[7rem] truncate text-[10px] xl:text-xs font-black uppercase tracking-wide text-white">
                      Հաշիվ
                    </span>
                    {studentMe?.user?.first_name ? (
                      <span className="max-w-[7rem] truncate text-[9px] text-white/45 font-bold">
                        {studentMe.user.first_name}
                      </span>
                    ) : null}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#FFC000]" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="z-[200] min-w-[12rem] rounded-xl border border-white/10 bg-[#1f1f1f] p-1.5 text-white shadow-xl"
                >
                  {ACCOUNT_MENU.map((entry) =>
                    entry.kind === 'route' ? (
                      <DropdownMenuItem key={entry.path} asChild>
                        <Link
                          to={entry.path}
                          className={`cursor-pointer rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-widest focus:bg-white/10 focus:text-white ${
                            isStudentRouteActive(entry.path)
                              ? 'bg-[#FFC000]/15 text-[#FFC000]'
                              : 'text-white/80'
                          }`}
                        >
                          {entry.name}
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        key="logout"
                        onSelect={() => handleStudentLogout()}
                        className="cursor-pointer rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-widest text-white/70 focus:bg-red-500/15 focus:text-red-300"
                      >
                        {entry.name}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`shrink-0 text-[10px] xl:text-xs 2xl:text-sm font-bold uppercase tracking-wide transition-colors hover:text-[#FFD700] ${
                    location.pathname === '/login' ? 'text-[#FFC000]' : 'text-white/70'
                  }`}
                >
                  Մուտք
                </Link>
                <Link
                  to="/register"
                  className="shrink-0 rounded-xl bg-[#FFD700] px-3 py-2 text-[10px] xl:text-xs 2xl:text-sm font-black uppercase tracking-wide text-[#222] transition-colors hover:bg-[#FFC000]"
                >
                  Գրանցվել
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="lg:hidden shrink-0 text-white p-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Բացել ընտրացանկը"
            onClick={() => setIsOpen(true)}
          >
            <Menu className="h-7 w-7" strokeWidth={2} />
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
              {ACCOUNT_MENU.map((entry) =>
                entry.kind === 'route' ? (
                  <Link
                    key={entry.path}
                    to={entry.path}
                    onClick={() => setIsOpen(false)}
                    className={`block text-xl font-bold uppercase ${
                      isStudentRouteActive(entry.path) ? 'text-[#FFC000]' : 'text-white'
                    }`}
                  >
                    {entry.name}
                  </Link>
                ) : (
                  <button
                    key="logout"
                    type="button"
                    onClick={() => {
                      handleStudentLogout();
                      setIsOpen(false);
                    }}
                    className="block w-full text-left text-xl font-bold uppercase text-white/70 hover:text-red-300"
                  >
                    {entry.name}
                  </button>
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