import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getVisitStatsSummary, getDailyLifeStats } from "@/api/admin";
import {
  Users,
  BookOpen,
  UserCheck,
  TrendingUp,
  Monitor,
  Smartphone,
  UserCircle,
  Rocket,
  CheckCircle2,
  Clock,
  XCircle,
  Briefcase,
  Heart,
  ArrowRight,
  Eye,
  Bot,
  Globe,
  FileText
} from "lucide-react";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/ui/Button";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getDashboardStats,
  });

  const { data: visits } = useQuery({
    queryKey: ["visit-stats"],
    queryFn: () => getVisitStatsSummary(),
  });

  const { data: dailyLifeStats, isLoading: isDailyLifeLoading } = useQuery({
    queryKey: ["daily-life-stats"],
    queryFn: getDailyLifeStats,
  });

  if (isStatsLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-32 bg-secondary rounded-xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-secondary rounded-xl" />
          <div className="h-64 bg-secondary rounded-xl" />
          <div className="h-64 bg-secondary rounded-xl" />
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Students", value: stats?.total_students || 0, icon: Users, color: "text-primary" },
    { label: "Active Courses", value: stats?.courses_summary?.active || 0, icon: BookOpen, color: "text-emerald-400" },
    { label: "Pending Regs", value: stats?.registrations?.pending || 0, icon: UserCheck, color: "text-amber-400" },
    { label: "Instructors", value: stats?.total_instructors || 0, icon: UserCircle, color: "text-blue-400" },
    { label: "ML Projects", value: stats?.total_ml_projects || 0, icon: Rocket, color: "text-purple-400" },
    { label: "Daily Life", value: dailyLifeStats?.total || 0, icon: Heart, color: "text-pink-400" },
    { label: "Total Visits", value: visits?.total_visits || 0, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-8 text-foreground pb-12">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening across the platform.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border border-border/50 shadow-sm bg-card" hoverable={false}>
            <div className="flex flex-row items-center justify-between pb-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Website Visits Summary */}
      <Card className="border border-border/50 shadow-sm bg-card" hoverable={false}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            Website Visits
          </h3>
          <Badge variant="outline">{visits?.total_visits || 0} Total</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
            <Eye className="h-5 w-5 text-primary mx-auto mb-2" />
            <div className="text-xl font-bold text-primary">{visits?.unique_visitors || 0}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Unique Visitors</div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
            <UserCircle className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
            <div className="text-xl font-bold text-emerald-500">{visits?.human_visits || 0}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Human Visits</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-center">
            <Bot className="h-5 w-5 text-amber-500 mx-auto mb-2" />
            <div className="text-xl font-bold text-amber-500">{visits?.bot_visits || 0}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Bot Visits</div>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
            <Globe className="h-5 w-5 text-blue-500 mx-auto mb-2" />
            <div className="text-xl font-bold text-blue-500">
              {(visits?.visits_by_country?.length as number | undefined) || 0}
            </div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Countries</div>
          </div>
          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 text-center">
            <TrendingUp className="h-5 w-5 text-purple-500 mx-auto mb-2" />
            <div className="text-xl font-bold text-purple-500">{visits?.avg_visits_per_unique ?? 0}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Avg / Visitor</div>
          </div>
        </div>


      </Card>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Registration Breakdown */}
        <Card className="lg:col-span-2 border border-border/50 shadow-sm bg-card" hoverable={false}>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <UserCheck size={18} className="text-primary" />
              Registration Summary
            </h3>
            <Badge variant="outline">{stats?.total_registrations || 0} Total</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-center">
              <Clock className="h-5 w-5 text-amber-500 mx-auto mb-2" />
              <div className="text-xl font-bold text-amber-500">{stats?.registrations?.pending || 0}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Pending</div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
              <div className="text-xl font-bold text-emerald-500">{stats?.registrations?.confirmed || 0}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Confirmed</div>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
              <Briefcase className="h-5 w-5 text-blue-500 mx-auto mb-2" />
              <div className="text-xl font-bold text-blue-500">{stats?.registrations?.completed || 0}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Completed</div>
            </div>
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-center">
              <XCircle className="h-5 w-5 text-destructive mx-auto mb-2" />
              <div className="text-xl font-bold text-destructive">{stats?.registrations?.rejected || 0}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Rejected</div>
            </div>
          </div>
        </Card>

        {/* Device Stats */}
        <Card className="border border-border/50 shadow-sm bg-card" hoverable={false}>
          <div className="mb-4 flex items-center gap-2">
            <Monitor size={18} className="text-primary" />
            <h3 className="font-bold">Traffic Source</h3>
          </div>
          <div className="space-y-6 pt-2">
            {[
              { label: "Desktop", value: visits?.desktop_visits || 0, icon: Monitor, color: "bg-primary" },
              { label: "Mobile", value: visits?.mobile_visits || 0, icon: Smartphone, color: "bg-emerald-500" },
            ].map((device) => {
              const percentage = visits?.total_visits ? Math.round((device.value / visits.total_visits) * 100) : 0;
              return (
                <div key={device.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <device.icon size={16} className="text-muted-foreground" />
                      <span className="font-medium">{device.label}</span>
                    </div>
                    <span className="font-bold">{percentage}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${device.color}`} style={{ width: `${percentage}%` }} />
                  </div>
                  <div className="text-[10px] text-muted-foreground text-right">{device.value} visits</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Daily Life Management */}
      <Card className="border border-border/50 shadow-sm bg-card" hoverable={false}>
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
          <h3 className="font-bold flex items-center gap-2">
            <Heart size={18} className="text-pink-400" />
            Daily Life Stories Management
          </h3>
          <Button 
            size="sm"
            onClick={() => navigate('/admin/daily-life')}
            className="gap-2"
          >
            <span>Manage Stories</span>
            <ArrowRight size={16} />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-pink-500/5 border border-pink-500/10 text-center">
            <div className="text-2xl font-bold text-pink-500 mb-1">{dailyLifeStats?.total || 0}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Stories</div>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
            <div className="text-2xl font-bold text-emerald-500 mb-1">{dailyLifeStats?.published || 0}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Published</div>
          </div>
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center">
            <div className="text-2xl font-bold text-amber-500 mb-1">{dailyLifeStats?.draft || 0}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Drafts</div>
          </div>
        </div>
      </Card>

      {/* Course Breakdown Table */}
      <Card className="border border-border/50 shadow-sm bg-card overflow-hidden" hoverable={false}>
        <div className="p-6 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            Course Statistics
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/30 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Instructor</th>
                <th className="px-6 py-4 text-center">Pending</th>
                <th className="px-6 py-4 text-center">Confirmed</th>
                <th className="px-6 py-4 text-center">Completed</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {stats?.courses?.map((course: any) => (
                <tr key={course.id} className="hover:bg-secondary/10 transition-colors">
                  <td className="px-6 py-4 font-semibold">{course.title}</td>
                  <td className="px-6 py-4 text-muted-foreground">{course.instructor}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={course.pending_count > 0 ? "text-amber-500 font-bold" : "text-muted-foreground"}>
                      {course.pending_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-medium">{course.confirmed_count}</td>
                  <td className="px-6 py-4 text-center text-muted-foreground">{course.completed_count}</td>
                  <td className="px-6 py-4 text-right">
                    <Badge variant={course.is_active ? "default" : "secondary"}>
                      {course.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
