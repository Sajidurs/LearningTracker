import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, CheckCircle2, Calendar, ChevronDown,
  Flame, Clock, Target, BookOpen, Award, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  format, subDays, subWeeks, subMonths, subYears,
  startOfDay, startOfWeek, startOfMonth, startOfYear,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  differenceInDays, isWithinInterval, parseISO,
} from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRange } from "react-day-picker";

type FilterType = "daily" | "weekly" | "monthly" | "yearly" | "custom";

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" },
];

const PIE_COLORS = [
  "hsl(84, 81%, 44%)",   // primary green
  "hsl(263, 70%, 77%)",  // purple
  "hsl(48, 96%, 53%)",   // yellow
  "hsl(0, 91%, 71%)",    // pink
  "hsl(217, 91%, 60%)",  // blue
];

const PerformancePage = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>("monthly");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);

  const dateRange = useMemo(() => {
    const now = new Date();
    if (filter === "custom" && customRange?.from) {
      return { from: customRange.from, to: customRange.to || now };
    }
    const ranges: Record<string, Date> = {
      daily: subDays(now, 1),
      weekly: subWeeks(now, 1),
      monthly: subMonths(now, 1),
      yearly: subYears(now, 1),
    };
    return { from: ranges[filter] || subMonths(now, 1), to: now };
  }, [filter, customRange]);

  const fromISO = dateRange.from.toISOString();
  const toISO = dateRange.to.toISOString();

  // Fetch topics
  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ["perf-topics", user?.id, fromISO, toISO],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("topics")
        .select("*, learning_journeys!inner(title)")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch time entries
  const { data: timeEntries, isLoading: timeLoading } = useQuery({
    queryKey: ["perf-time", user?.id, fromISO, toISO],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("started_at", fromISO)
        .lte("started_at", toISO);
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch points log
  const { data: pointsLog, isLoading: pointsLoading } = useQuery({
    queryKey: ["perf-points", user?.id, fromISO, toISO],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("points_log")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", fromISO)
        .lte("created_at", toISO);
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch profile
  const { data: profile } = useQuery({
    queryKey: ["perf-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const isLoading = topicsLoading || timeLoading || pointsLoading;

  // --- Computed Stats ---
  const allTopics = topics || [];
  const filteredTopics = allTopics.filter((t) => {
    const d = parseISO(t.created_at);
    return isWithinInterval(d, { start: dateRange.from, end: dateRange.to });
  });
  const completedTopics = allTopics.filter((t) => t.is_completed);
  const completedInRange = filteredTopics.filter((t) => t.is_completed);
  const completionRate = allTopics.length > 0
    ? Math.round((completedTopics.length / allTopics.length) * 100)
    : 0;

  const totalStudySeconds = (timeEntries || []).reduce((s, e) => s + (e.duration_seconds || 0), 0);
  const totalStudyHours = Math.round((totalStudySeconds / 3600) * 10) / 10;
  const totalPoints = (pointsLog || []).reduce((s, e) => s + e.points, 0);

  // Journey breakdown for pie chart
  const journeyMap = useMemo(() => {
    const map: Record<string, { name: string; total: number; completed: number }> = {};
    allTopics.forEach((t: any) => {
      const jName = t.learning_journeys?.title || "Unknown";
      if (!map[t.journey_id]) map[t.journey_id] = { name: jName, total: 0, completed: 0 };
      map[t.journey_id].total++;
      if (t.is_completed) map[t.journey_id].completed++;
    });
    return Object.values(map);
  }, [allTopics]);

  const pieData = journeyMap.map((j) => ({
    name: j.name,
    value: j.total,
    completed: j.completed,
  }));

  // Activity timeline chart
  const activityData = useMemo(() => {
    const entries = timeEntries || [];
    if (filter === "yearly") {
      const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
      return months.map((m) => {
        const label = format(m, "MMM");
        const secs = entries.filter((e) => {
          const d = parseISO(e.started_at);
          return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
        }).reduce((s, e) => s + (e.duration_seconds || 0), 0);
        return { label, minutes: Math.round(secs / 60) };
      });
    }
    if (filter === "monthly" || filter === "custom") {
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const limited = days.length > 31 ? days.slice(-31) : days;
      return limited.map((d) => {
        const label = format(d, "dd");
        const secs = entries.filter((e) => {
          const ed = parseISO(e.started_at);
          return format(ed, "yyyy-MM-dd") === format(d, "yyyy-MM-dd");
        }).reduce((s, e) => s + (e.duration_seconds || 0), 0);
        return { label, minutes: Math.round(secs / 60) };
      });
    }
    // daily / weekly
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    return days.map((d) => {
      const label = format(d, "EEE");
      const secs = entries.filter((e) => {
        const ed = parseISO(e.started_at);
        return format(ed, "yyyy-MM-dd") === format(d, "yyyy-MM-dd");
      }).reduce((s, e) => s + (e.duration_seconds || 0), 0);
      return { label, minutes: Math.round(secs / 60) };
    });
  }, [timeEntries, filter, dateRange]);

  // Points over time
  const pointsData = useMemo(() => {
    const log = pointsLog || [];
    if (filter === "yearly") {
      const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
      return months.map((m) => {
        const pts = log.filter((e) => {
          const d = parseISO(e.created_at);
          return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
        }).reduce((s, e) => s + e.points, 0);
        return { label: format(m, "MMM"), points: pts };
      });
    }
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const limited = days.length > 31 ? days.slice(-31) : days;
    return limited.map((d) => {
      const pts = log.filter((e) => format(parseISO(e.created_at), "yyyy-MM-dd") === format(d, "yyyy-MM-dd"))
        .reduce((s, e) => s + e.points, 0);
      return { label: format(d, "dd MMM"), points: pts };
    });
  }, [pointsLog, filter, dateRange]);

  // Completion trend (topics completed over time)
  const completionTrend = useMemo(() => {
    if (filter === "yearly") {
      const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
      return months.map((m) => {
        const count = filteredTopics.filter((t) => {
          if (!t.is_completed) return false;
          const d = parseISO(t.updated_at);
          return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
        }).length;
        return { label: format(m, "MMM"), completed: count };
      });
    }
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const limited = days.length > 31 ? days.slice(-31) : days;
    return limited.map((d) => {
      const count = filteredTopics.filter((t) => {
        if (!t.is_completed) return false;
        return format(parseISO(t.updated_at), "yyyy-MM-dd") === format(d, "yyyy-MM-dd");
      }).length;
      return { label: format(d, "dd"), completed: count };
    });
  }, [filteredTopics, filter, dateRange]);

  // Streak calculation
  const streak = useMemo(() => {
    const entries = timeEntries || [];
    const uniqueDays = new Set(entries.map((e) => format(parseISO(e.started_at), "yyyy-MM-dd")));
    let count = 0;
    let d = new Date();
    while (uniqueDays.has(format(d, "yyyy-MM-dd"))) {
      count++;
      d = subDays(d, 1);
    }
    return count;
  }, [timeEntries]);

  const filterLabel = filter === "custom" && customRange?.from
    ? `${format(customRange.from, "MMM d")}${customRange.to ? ` - ${format(customRange.to, "MMM d")}` : ""}`
    : FILTER_OPTIONS.find((f) => f.value === filter)?.label || "Monthly";

  const card = "p-5 rounded-2xl bg-card shadow-card border border-border/50";
  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-semibold text-foreground tracking-tight leading-tight">Performance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Analyze your learning analytics and progress.</p>
        </div>
        <div className="flex items-center gap-2">
          {FILTER_OPTIONS.filter((f) => f.value !== "custom").map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs h-8"
              onClick={() => { setFilter(f.value); setFilterOpen(false); }}
            >
              {f.label}
            </Button>
          ))}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filter === "custom" ? "default" : "outline"}
                size="sm"
                className="rounded-full text-xs h-8 gap-1.5"
                onClick={() => setFilter("custom")}
              >
                <Calendar className="w-3.5 h-3.5" />
                {filter === "custom" ? filterLabel : "Custom"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarPicker
                mode="range"
                selected={customRange}
                onSelect={(range) => {
                  setCustomRange(range);
                  if (range?.from && range?.to) setFilterOpen(false);
                }}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: CheckCircle2,
            label: "Topics Completed",
            value: isLoading ? null : `${completedInRange.length}`,
            sub: `of ${filteredTopics.length} total`,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            icon: Clock,
            label: "Study Time",
            value: isLoading ? null : `${totalStudyHours}h`,
            sub: "in this period",
            color: "text-chart-purple",
            bg: "bg-chart-purple/10",
          },
          {
            icon: Zap,
            label: "Points Earned",
            value: isLoading ? null : `${totalPoints}`,
            sub: `${profile?.total_points || 0} lifetime`,
            color: "text-chart-yellow",
            bg: "bg-chart-yellow/10",
          },
          {
            icon: Flame,
            label: "Current Streak",
            value: isLoading ? null : `${streak}`,
            sub: streak === 1 ? "day" : "days",
            color: "text-destructive",
            bg: "bg-destructive/10",
          },
        ].map((stat, i) => (
          <motion.div key={stat.label} {...fadeUp(i * 0.05)} className={card}>
            <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
            </div>
            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
            {stat.value !== null ? (
              <>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</p>
              </>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Row 2: Study Activity + Completion Rate */}
      <div className="grid lg:grid-cols-5 gap-6">
        <motion.div {...fadeUp(0.15)} className={`${card} lg:col-span-3`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Study Activity</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Minutes spent learning</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{Math.round(totalStudySeconds / 60)}m total</span>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-[180px] w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={activityData} barSize={filter === "yearly" ? 20 : 12}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 9%, 46%)" }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`${v}m`, "Study Time"]}
                  cursor={{ fill: "hsl(var(--muted))", radius: 8 }}
                />
                <Bar dataKey="minutes" radius={[6, 6, 2, 2]} fill="hsl(84, 81%, 44%)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div {...fadeUp(0.2)} className={`${card} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Completion Rate</h3>
            <span className="text-2xl font-bold text-foreground">{completionRate}%</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Overall topic completion</p>

          {/* Progress ring */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <motion.circle
                  cx="64" cy="64" r="52" fill="none"
                  stroke="hsl(84, 81%, 44%)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - completionRate / 100) }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{completedTopics.length}</span>
                <span className="text-[10px] text-muted-foreground">of {allTopics.length}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-primary/5 text-center">
              <p className="text-lg font-bold text-foreground">{completedTopics.length}</p>
              <p className="text-[10px] text-muted-foreground">Completed</p>
            </div>
            <div className="p-2.5 rounded-xl bg-chart-purple/10 text-center">
              <p className="text-lg font-bold text-foreground">{allTopics.length - completedTopics.length}</p>
              <p className="text-[10px] text-muted-foreground">Remaining</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Row 3: Points Trend + Journey Breakdown + Completion Trend */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Points trend */}
        <motion.div {...fadeUp(0.25)} className={card}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-foreground">Points Earned</h3>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground mb-3">Over the selected period</p>
          {isLoading ? (
            <Skeleton className="h-[140px] w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={pointsData}>
                <defs>
                  <linearGradient id="pointsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(84, 81%, 44%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(84, 81%, 44%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "hsl(220, 9%, 46%)" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="points" stroke="hsl(84, 81%, 44%)" strokeWidth={2} fill="url(#pointsGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xl font-bold text-foreground">{totalPoints}</span>
            <span className="text-xs text-muted-foreground">pts earned</span>
          </div>
        </motion.div>

        {/* Journey Breakdown Pie */}
        <motion.div {...fadeUp(0.3)} className={card}>
          <h3 className="text-sm font-semibold text-foreground mb-1">Journey Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-3">Topics per journey</p>
          {isLoading ? (
            <Skeleton className="h-[140px] w-full rounded-xl" />
          ) : pieData.length === 0 ? (
            <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">No journeys yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number, _: any, entry: any) => [`${entry.payload.completed}/${v} completed`, entry.payload.name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.slice(0, 3).map((j, i) => (
                  <div key={j.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground truncate flex-1">{j.name}</span>
                    <span className="font-medium text-foreground">{j.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Completion Trend */}
        <motion.div {...fadeUp(0.35)} className={card}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-foreground">Completion Trend</h3>
            <Target className="w-4 h-4 text-chart-purple" />
          </div>
          <p className="text-xs text-muted-foreground mb-3">Topics completed over time</p>
          {isLoading ? (
            <Skeleton className="h-[140px] w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={completionTrend} barSize={10}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "hsl(220, 9%, 46%)" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="completed" radius={[4, 4, 2, 2]} fill="hsl(263, 70%, 77%)" />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xl font-bold text-foreground">{completedInRange.length}</span>
            <span className="text-xs text-muted-foreground">completed in period</span>
          </div>
        </motion.div>
      </div>

      {/* Row 4: Learning Progress + Streak & Summary */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Learning Progress by Journey */}
        <motion.div {...fadeUp(0.4)} className={card}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Learning Progress</h3>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : journeyMap.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No learning journeys yet. Create one to track progress!</p>
          ) : (
            <div className="space-y-4">
              {journeyMap.map((j, i) => {
                const pct = j.total > 0 ? Math.round((j.completed / j.total) * 100) : 0;
                return (
                  <div key={j.name}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-foreground font-medium truncate max-w-[200px]">{j.name}</span>
                      <span className="text-xs text-muted-foreground">{j.completed}/{j.total} topics</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{pct}% complete</p>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Streak & Quick Stats */}
        <motion.div {...fadeUp(0.45)} className={card}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Quick Summary</h3>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-destructive" />
                <span className="text-xs text-muted-foreground">Streak</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{streak} <span className="text-sm font-normal text-muted-foreground">days</span></p>
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted-foreground">Lifetime Points</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{profile?.total_points || 0}</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: "Study Time", value: `${totalStudyHours}h`, pct: Math.min(100, (totalStudyHours / 20) * 100), color: "bg-primary" },
              { label: "Points Earned", value: `${totalPoints} pts`, pct: Math.min(100, (totalPoints / 500) * 100), color: "bg-chart-purple" },
              { label: "Topics Done", value: `${completedInRange.length}`, pct: filteredTopics.length > 0 ? (completedInRange.length / filteredTopics.length) * 100 : 0, color: "bg-chart-yellow" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold text-foreground">{item.value}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(item.pct)}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className={`h-full rounded-full ${item.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PerformancePage;
