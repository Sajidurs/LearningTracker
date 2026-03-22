import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, Target, CreditCard, TrendingUp, Layers, Activity, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, CartesianGrid, Legend, AreaChart, Area } from "recharts";

interface Stats {
  totalUsers: number;
  totalJourneys: number;
  totalTopics: number;
  planCounts: { free: number; paid: number };
  stripeStats: { revenue: number; activeSubscriptions: number };
  recentUsers: RecentUser[];
  completedTopics: number;
  totalTopicsCount: number;
  topicsOverTime: { date: string; count: number }[];
}

interface RecentUser {
  full_name: string | null;
  plan: string;
  created_at: string;
}

const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) => (
  <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-primary-foreground" />
      </div>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

const AdminDashboardPage = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [topicsOverTime, setTopicsOverTime] = useState<{ date: string; count: number }[]>([]);
  const [completionRate, setCompletionRate] = useState<{ completed: number; pending: number }>({ completed: 0, pending: 0 });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data: statsData } = await supabase.functions.invoke("admin-api", { body: { action: "get_stats" } });
        if (statsData && !statsData.error) {
          setStats(statsData);
          setRecentUsers(statsData.recentUsers || []);
          setTopicsOverTime(
            (statsData.topicsOverTime || []).map((t: { date: string; count: number }) => ({
              date: new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              count: t.count,
            }))
          );
          setCompletionRate({
            completed: statsData.completedTopics || 0,
            pending: (statsData.totalTopicsCount || 0) - (statsData.completedTopics || 0),
          });
        }
      } catch (e) {
        console.error("Failed to fetch admin stats:", e);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!stats) return <p className="text-center text-muted-foreground py-20">Failed to load stats.</p>;

  const planData = [
    { name: "Free", value: stats.planCounts.free, fill: "hsl(var(--muted-foreground))" },
    { name: "Paid", value: stats.planCounts.paid, fill: "hsl(var(--primary))" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">Real-time platform metrics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="bg-primary" />
        <StatCard icon={BookOpen} label="Journeys" value={stats.totalJourneys} color="bg-primary/80" />
        <StatCard icon={Target} label="Topics" value={stats.totalTopics} color="bg-chart-purple" />
        <StatCard icon={CreditCard} label="Subscriptions" value={stats.stripeStats.activeSubscriptions} color="bg-info" />
      </div>

      {/* Revenue + Completion Rate row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard icon={TrendingUp} label="Revenue" value={`$${stats.stripeStats.revenue.toFixed(2)}`} sub="Total Stripe revenue" color="bg-primary" />
        <StatCard icon={Activity} label="Topic Completion" value={`${completionRate.completed + completionRate.pending > 0 ? Math.round((completionRate.completed / (completionRate.completed + completionRate.pending)) * 100) : 0}%`} sub={`${completionRate.completed} completed / ${completionRate.pending} pending`} color="bg-chart-purple" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Topics created over time */}
        <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground">Topics Created (Last 7 Days)</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={topicsOverTime}>
                <defs>
                  <linearGradient id="topicGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#topicGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution Pie */}
        <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground">Plan Distribution</h3>
          <div className="h-[220px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`}>
                  {planData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4">
            {planData.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill }} />
                <span className="text-xs text-muted-foreground">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Recent Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Plan</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 text-foreground font-medium">{u.full_name || "—"}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                      u.plan === "paid" ? "bg-primary/10 text-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>{u.plan}</span>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground text-xs">
                    {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
