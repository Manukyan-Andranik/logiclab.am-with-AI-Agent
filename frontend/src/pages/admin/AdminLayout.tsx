import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, BookOpen, UserCheck, MessageSquare,
  LogOut, Settings, Briefcase, Heart, Menu, X, Activity,
} from "lucide-react";
import { useEffect, useState } from "react";

const menuItems = [
  { label: "Dashboard",     href: "/admin",                icon: LayoutDashboard },
  { label: "Registrations", href: "/admin/registrations",  icon: UserCheck },
  { label: "Courses",       href: "/admin/courses",        icon: BookOpen },
  { label: "Students",      href: "/admin/students",       icon: Users },
  { label: "Projects",      href: "/admin/projects",       icon: Briefcase },
  { label: "Daily Life",    href: "/admin/daily-life",     icon: Heart },
  { label: "Instructors",   href: "/admin/instructors",    icon: Users },
  { label: "Messages",      href: "/admin/messages",       icon: MessageSquare },
  { label: "Visits",        href: "/admin/visits",         icon: Activity },
];

interface SidebarNavProps {
  pathname: string;
  onClose?: () => void;
  onLogout: () => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ pathname, onClose, onLogout }) => (
  <div className="flex flex-col h-full">
    {/* Logo row */}
    <div className="flex items-center justify-between p-6 pb-4">
      <Link
        to="/"
        className="flex items-center gap-1 font-display text-xl font-bold"
        onClick={onClose}
      >
        <span className="text-primary">Logic</span>
        <span className="text-foreground">Lab</span>
        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-2 uppercase tracking-tighter">
          Admin
        </span>
      </Link>
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      )}
    </div>

    {/* Nav links */}
    <nav className="flex-1 px-4 pb-4 space-y-0.5 overflow-y-auto">
      {menuItems.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>

    {/* Bottom actions */}
    <div className="p-4 border-t border-border space-y-0.5">
      <Link
        to="/admin/settings"
        onClick={onClose}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
      >
        <Settings size={18} />
        Settings
      </Link>
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#dc3545] hover:bg-[#dc3545]/10 transition-all duration-200"
      >
        <LogOut size={18} />
        Logout
      </button>
    </div>
  </div>
);

const AdminLayout = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    if (!token || role !== "admin") navigate("/login?role=admin");
  }, [navigate]);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-background border-r border-border sticky top-0 h-screen overflow-hidden">
        <SidebarNav
          pathname={location.pathname}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Mobile overlay ────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ─────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border flex flex-col lg:hidden transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarNav
          pathname={location.pathname}
          onClose={() => setMobileOpen(false)}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-background border-b border-border">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className="font-display font-bold text-lg">
            <span className="text-primary">Logic</span>
            <span className="text-foreground">Lab</span>
            <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-tighter">
              Admin
            </span>
          </span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
