import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, BookOpen, UserCheck, MessageSquare, LogOut, Settings } from "lucide-react";
import { useEffect } from "react";
import { ModeToggle } from "@/components/mode-toggle";

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || role !== 'admin') {
      navigate('/admin/login');
    }
  }, [navigate]);

  const menuItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Registrations", href: "/admin/registrations", icon: UserCheck },
    { label: "Courses", href: "/admin/courses", icon: BookOpen },
    { label: "Students", href: "/admin/students", icon: Users },
    { label: "Instructors", href: "/admin/instructors", icon: Users },
    { label: "Messages", href: "/admin/messages", icon: MessageSquare },
  ];

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r border-border sticky top-0 h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-10">
            <Link to="/" className="flex items-center gap-1 font-display text-xl font-bold">
              <span className="text-gold">Logic</span>
              <span className="text-foreground">Lab</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-2 uppercase tracking-tighter">Admin</span>
            </Link>
            <ModeToggle />
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
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
        </div>

        <div className="p-6 mt-auto border-t border-border space-y-1">
          <Link
            to="/admin/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Settings size={18} />
            Settings
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/';
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
