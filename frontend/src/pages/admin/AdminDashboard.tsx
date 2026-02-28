import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getVisitStatsSummary } from "@/api/admin";
import { Users, BookOpen, UserCheck, TrendingUp, Monitor, Smartphone } from "lucide-react";
import Card from "@/components/ui/Card";

const AdminDashboard = () => {
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getDashboardStats,
  });

  const { data: visits, isLoading: isVisitsLoading } = useQuery({
    queryKey: ["visit-stats"],
    queryFn: getVisitStatsSummary,
  });

  if (isStatsLoading || isVisitsLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-32 bg-[var(--gray-dark)] rounded-xl w-full"></div>
        <div className="grid grid-cols-3 gap-6">
          <div className="h-64 bg-[var(--gray-dark)] rounded-xl"></div>
          <div className="h-64 bg-[var(--gray-dark)] rounded-xl"></div>
          <div className="h-64 bg-[var(--gray-dark)] rounded-xl"></div>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Students", value: stats?.total_students || 0, icon: Users, color: "text-[var(--blue)]" },
    { label: "Active Courses", value: stats?.courses_summary?.active || 0, icon: BookOpen, color: "text-[var(--success)]" },
    { label: "Pending Regs", value: stats?.registrations?.pending || 0, icon: UserCheck, color: "text-[var(--warning)]" },
    { label: "Total Visits", value: visits?.total_visits || 0, icon: TrendingUp, color: "text-[var(--primary)]" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--black)]">Dashboard</h1>
        <p className="text-[var(--gray-dark)] opacity-70">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm bg-[var(--white)]" hoverable={false}>
            <div className="flex flex-row items-center justify-between pb-2 mb-2">
              <span className="text-sm font-medium text-[var(--gray-dark)] opacity-70">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--black)]">{stat.value}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Device Stats */}
        <Card className="border-none shadow-sm bg-[var(--white)]" hoverable={false}>
          <div className="mb-4">
            <h3 className="font-bold text-[var(--black)]">Visits by Device</h3>
          </div>
          <div>
            <div className="space-y-4">
              {[
                { label: "Desktop", value: visits?.desktop_visits || 0, icon: Monitor },
                { label: "Mobile", value: visits?.mobile_visits || 0, icon: Smartphone },
              ].map((device) => {
                const percentage = visits?.total_visits ? Math.round((device.value / visits.total_visits) * 100) : 0;
                return (
                  <div key={device.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <device.icon size={16} className="text-[var(--gray-dark)]" />
                        <span className="text-[var(--black)]">{device.label}</span>
                      </div>
                      <span className="font-medium text-[var(--black)]">{device.value} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-[var(--gray-light)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--primary)]" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Recent Activity placeholder */}
        <Card className="border-none shadow-sm bg-[var(--white)]" hoverable={false}>
          <div className="mb-4">
            <h3 className="font-bold text-[var(--black)]">System Overview</h3>
          </div>
          <div>
            <div className="space-y-4 text-sm text-[var(--gray-dark)]">
              <p>• System is running smoothly</p>
              <p>• Last registration: {stats?.last_registration_date || 'N/A'}</p>
              <p>• Database backup: Successful</p>
              <p>• New messages: {stats?.new_messages || 0}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
