import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, BookOpen, CalendarDays, TrendingUp, Target, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Topic {
  id: string;
  title: string;
  is_completed: boolean;
  journey_id: string;
  week_number: number | null;
  day_of_week: number | null;
  created_at: string;
}

interface Journey {
  id: string;
  title: string;
  start_date: string | null;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const JOURNEY_COLORS = [
  { bg: "bg-primary/10", text: "text-foreground", border: "border-primary/20", dot: "bg-primary" },
  { bg: "bg-chart-purple/10", text: "text-chart-purple", border: "border-chart-purple/20", dot: "bg-chart-purple" },
  { bg: "bg-info/10", text: "text-info", border: "border-info/20", dot: "bg-info" },
  { bg: "bg-warning/10", text: "text-foreground", border: "border-warning/20", dot: "bg-warning" },
  { bg: "bg-chart-pink/10", text: "text-chart-pink", border: "border-chart-pink/20", dot: "bg-chart-pink" },
];

const CalendarPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedJourneyId, setSelectedJourneyId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");

  const { data: journeys = [], isLoading: journeysLoading } = useQuery({
    queryKey: ["calendar-journeys", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("learning_journeys").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return (data || []) as Journey[];
    },
    enabled: !!user,
  });

  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ["calendar-topics", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("*").eq("user_id", user!.id).order("sort_order");
      return (data || []) as Topic[];
    },
    enabled: !!user,
  });

  const availableTopics = useMemo(() => {
    if (!selectedJourneyId) return [];
    return topics.filter(t => t.journey_id === selectedJourneyId && !t.is_completed);
  }, [selectedJourneyId, topics]);

  const topicsByDate = useMemo(() => {
    const map: Record<string, { topic: Topic; journey: Journey }[]> = {};
    topics.forEach(t => {
      const journey = journeys.find(j => j.id === t.journey_id);
      if (!journey || !journey.start_date || t.week_number == null || t.day_of_week == null) return;
      const startDate = new Date(journey.start_date);
      const topicDate = addDays(startDate, (t.week_number - 1) * 7 + (t.day_of_week - 1));
      const key = format(topicDate, "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push({ topic: t, journey });
    });
    return map;
  }, [topics, journeys]);

  // Map each journey to a consistent color index
  const journeyColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    journeys.forEach((j, i) => { map[j.id] = i % JOURNEY_COLORS.length; });
    return map;
  }, [journeys]);

  const getJourneyColor = (journeyId: string) => JOURNEY_COLORS[journeyColorMap[journeyId] ?? 0];

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let d = calStart;
    while (d <= calEnd) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [currentMonth]);

  // Stats
  const stats = useMemo(() => {
    const completedTopics = topics.filter(t => t.is_completed).length;
    const totalTopics = topics.length;
    const scheduledTopics = topics.filter(t => t.week_number != null && t.day_of_week != null).length;
    const activeJourneys = journeys.length;

    // Weekly activity for chart
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyData = weekDays.map((name, i) => {
      const count = topics.filter(t => t.day_of_week === i + 1).length;
      return { name, count };
    });

    return { completedTopics, totalTopics, scheduledTopics, activeJourneys, weeklyData };
  }, [topics, journeys]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setAddDialogOpen(true);
    setSelectedJourneyId("");
    setSelectedTopicId("");
  };

  const handleAddTopic = async () => {
    if (!selectedTopicId || !selectedDate || !user) return;
    const journey = journeys.find(j => j.id === selectedJourneyId);
    if (!journey || !journey.start_date) {
      toast({ title: "Error", description: "Selected journey has no start date." });
      return;
    }
    const startDate = new Date(journey.start_date);
    const daysDiff = Math.round((selectedDate.getTime() - startDate.getTime()) / 86400000);
    const weekNumber = Math.floor(daysDiff / 7) + 1;
    const dayOfWeek = (daysDiff % 7) + 1;

    await supabase.from("topics").update({
      week_number: weekNumber,
      day_of_week: dayOfWeek,
    } as any).eq("id", selectedTopicId);

    toast({ title: "Topic scheduled!", description: `Added to ${format(selectedDate, "MMM d, yyyy")}` });
    setAddDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["calendar-topics"] });
  };

  const isLoading = journeysLoading || topicsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5 min-h-[calc(100vh-120px)]">
      {/* Mobile Stats */}
      <div className="lg:hidden grid grid-cols-4 gap-2">
        <div className="rounded-xl bg-primary/10 p-2.5 text-center">
          <Target className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
          <p className="text-base font-bold text-foreground">{stats.completedTopics}</p>
          <p className="text-[9px] text-muted-foreground">Done</p>
        </div>
        <div className="rounded-xl bg-info/10 p-2.5 text-center">
          <CalendarDays className="w-3.5 h-3.5 text-info mx-auto mb-0.5" />
          <p className="text-base font-bold text-foreground">{stats.scheduledTopics}</p>
          <p className="text-[9px] text-muted-foreground">Scheduled</p>
        </div>
        <div className="rounded-xl bg-chart-purple/10 p-2.5 text-center">
          <BookOpen className="w-3.5 h-3.5 text-chart-purple mx-auto mb-0.5" />
          <p className="text-base font-bold text-foreground">{stats.activeJourneys}</p>
          <p className="text-[9px] text-muted-foreground">Journeys</p>
        </div>
        <div className="rounded-xl bg-warning/10 p-2.5 text-center">
          <TrendingUp className="w-3.5 h-3.5 text-warning mx-auto mb-0.5" />
          <p className="text-base font-bold text-foreground">{stats.totalTopics}</p>
          <p className="text-[9px] text-muted-foreground">Topics</p>
        </div>
      </div>

      {/* Main Calendar */}
      <div className="flex-1 space-y-4">
        {/* Header with month nav */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Calendar</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <h2 className="text-base font-bold text-foreground min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Calendar card with subtle gradient */}
        <div className="rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 shadow-sm border border-border overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map(day => (
              <div key={day} className="py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date, idx) => {
              const dateKey = format(date, "yyyy-MM-dd");
              const dayTopics = topicsByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isToday = isSameDay(date, new Date());

              // Color the date cell based on the first journey's color
              const cellColor = dayTopics.length > 0 && isCurrentMonth
                ? getJourneyColor(dayTopics[0].journey.id)
                : null;

              return (
                <div
                  key={idx}
                  onClick={() => handleDateClick(date)}
                  className={`relative min-h-[100px] border-t border-r border-border/50 p-2 cursor-pointer transition-all duration-150 hover:bg-primary/5 ${
                    !isCurrentMonth ? "opacity-30 bg-muted/20" : ""
                  } ${idx % 7 === 0 ? "border-l-0" : ""} ${cellColor ? cellColor.bg : ""}`}
                >
                  <span className={`text-sm font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full ${
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                  }`}>
                    {format(date, "d")}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayTopics.slice(0, 2).map(({ topic, journey }) => {
                      const color = getJourneyColor(journey.id);
                      return (
                        <div
                          key={topic.id}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate ${color.bg} ${color.text} ${
                            topic.is_completed ? "line-through opacity-50" : ""
                          }`}
                        >
                          {topic.title}
                        </div>
                      );
                    })}
                    {dayTopics.length > 2 && (
                      <span className="text-[10px] text-muted-foreground pl-1">+{dayTopics.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:flex flex-col w-[260px] gap-4 shrink-0">
        {/* Quick Stats */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Overview</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-center">
              <Target className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{stats.completedTopics}</p>
              <p className="text-[10px] text-muted-foreground">Completed</p>
            </div>
            <div className="rounded-xl bg-info/10 p-3 text-center">
              <CalendarDays className="w-4 h-4 text-info mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{stats.scheduledTopics}</p>
              <p className="text-[10px] text-muted-foreground">Scheduled</p>
            </div>
            <div className="rounded-xl bg-chart-purple/10 p-3 text-center">
              <BookOpen className="w-4 h-4 text-chart-purple mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{stats.activeJourneys}</p>
              <p className="text-[10px] text-muted-foreground">Journeys</p>
            </div>
            <div className="rounded-xl bg-warning/10 p-3 text-center">
              <TrendingUp className="w-4 h-4 text-warning mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{stats.totalTopics}</p>
              <p className="text-[10px] text-muted-foreground">Total Topics</p>
            </div>
          </div>
        </div>

        {/* Weekly Activity Chart */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">Weekly Activity</h3>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyData} barSize={16}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid hsl(var(--border))" }}
                  cursor={{ fill: "hsl(var(--muted))", radius: 8 }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {stats.weeklyData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--chart-purple))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Progress Ring */}
        <div className="rounded-2xl bg-gradient-to-br from-card to-muted/20 border border-border p-4 text-center space-y-2">
          <h3 className="text-sm font-bold text-foreground">Completion Rate</h3>
          <p className="text-3xl font-bold text-primary">
            {stats.totalTopics > 0 ? Math.round((stats.completedTopics / stats.totalTopics) * 100) : 0}%
          </p>
          <p className="text-[11px] text-muted-foreground">{stats.completedTopics} of {stats.totalTopics} topics done</p>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${stats.totalTopics > 0 ? (stats.completedTopics / stats.totalTopics) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Add Topic Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {selectedDate && format(selectedDate, "d MMMM yyyy, EEEE")}
            </DialogTitle>
          </DialogHeader>

          {selectedDate && (topicsByDate[format(selectedDate, "yyyy-MM-dd")] || []).length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scheduled Topics</p>
              {(topicsByDate[format(selectedDate, "yyyy-MM-dd")] || []).map(({ topic, journey }) => {
                const color = getJourneyColor(journey.id);
                return (
                  <div
                    key={topic.id}
                    className={`p-3 rounded-xl ${color.bg} cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all`}
                    onClick={() => { setAddDialogOpen(false); navigate(`/app/learning/${journey.id}/topic/${topic.id}`); }}
                  >
                    <p className="text-sm font-medium">{topic.title}</p>
                    <p className="text-xs opacity-70">{journey.title}</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Topic to this Date</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">1. Select Learning Journey</label>
              <Select value={selectedJourneyId} onValueChange={(v) => { setSelectedJourneyId(v); setSelectedTopicId(""); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose a journey..." />
                </SelectTrigger>
                <SelectContent>
                  {journeys.filter(j => j.start_date).map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {journeys.filter(j => j.start_date).length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">No journeys with a start date found.</p>
              )}
            </div>

            {selectedJourneyId && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">2. Select Topic</label>
                <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choose a topic..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTopics.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableTopics.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No available topics in this journey.</p>
                )}
              </div>
            )}

            <Button onClick={handleAddTopic} disabled={!selectedTopicId} className="w-full rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Topic
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
