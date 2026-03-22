import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, CheckCircle2, Plus, Loader2, X, Trash2, GripVertical, ChevronUp, ChevronDown, Edit2, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Topic {
  id: string;
  title: string;
  is_completed: boolean;
  points_value: number;
  week_number: number | null;
  youtube_url: string | null;
  notes: string | null;
  sort_order: number;
}

interface SubTopic {
  id: string;
  topic_id: string;
  title: string;
  is_completed: boolean;
}

interface Journey {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

interface TimeEntry {
  id: string;
  topic_id: string;
  duration_seconds: number;
  created_at: string;
}

// Sortable topic row
const SortableTopicRow = ({
  topic, subTopics, onToggle, onSelect, onAddSub, onDelete, showAddSub, newSubTopic, setNewSubTopic, onSaveSub, onCancelSub,
  isEditing, editingTitle, onStartEdit, onCancelEdit, onUpdateTitle,
}: {
  topic: Topic;
  subTopics: SubTopic[];
  onToggle: () => void;
  onSelect: () => void;
  onAddSub: () => void;
  onDelete: () => void;
  showAddSub: boolean;
  newSubTopic: string;
  setNewSubTopic: (v: string) => void;
  onSaveSub: () => void;
  onCancelSub: () => void;
  isEditing: boolean;
  editingTitle: string;
  onStartEdit: (title: string) => void;
  onCancelEdit: () => void;
  onUpdateTitle: (title: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: topic.id, data: { topic } });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [localTitle, setLocalTitle] = useState(editingTitle);

  useEffect(() => {
    if (isEditing) setLocalTitle(editingTitle);
  }, [isEditing, editingTitle]);

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 rounded-xl transition-colors group ${topic.is_completed ? "bg-primary/5" : "hover:bg-muted/50"}`}>
        <button className="cursor-grab active:cursor-grabbing p-0.5 touch-none" {...listeners}>
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={onToggle}>
          <CheckCircle2 className={`w-4 h-4 shrink-0 ${topic.is_completed ? "text-primary" : "text-border"}`} />
        </button>

        {isEditing ? (
          <div className="flex-1 flex gap-2">
            <Input
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onUpdateTitle(localTitle);
                if (e.key === "Escape") onCancelEdit();
              }}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => onUpdateTitle(localTitle)}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={onCancelEdit}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            <span className={`text-sm flex-1 cursor-pointer truncate ${topic.is_completed ? "text-muted-foreground line-through" : "text-foreground"}`} onClick={onSelect}>
              {topic.title}
            </span>
            <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{topic.points_value}pts</Badge>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onStartEdit(topic.title)} className="p-1 rounded hover:bg-muted"><Edit2 className="w-3 h-3 text-muted-foreground" /></button>
              <button onClick={onAddSub} className="p-1 rounded hover:bg-muted"><Plus className="w-3 h-3 text-muted-foreground" /></button>
              <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3 h-3 text-destructive" /></button>
            </div>
          </>
        )}
      </div>
      {subTopics.length > 0 && (
        <div className="ml-10 space-y-0.5 mb-1">
          {subTopics.map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
              <CheckCircle2 className={`w-3 h-3 ${s.is_completed ? "text-primary" : "text-border"}`} />
              <span className={s.is_completed ? "line-through" : ""}>{s.title}</span>
            </div>
          ))}
        </div>
      )}
      {showAddSub && (
        <div className="ml-10 flex gap-2 mb-2">
          <Input placeholder="Sub-topic name..." value={newSubTopic} onChange={(e) => setNewSubTopic(e.target.value)} className="h-7 text-xs"
            onKeyDown={(e) => e.key === "Enter" && onSaveSub()} />
          <Button size="sm" className="h-7 text-xs" onClick={onSaveSub}>Add</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancelSub}><X className="w-3 h-3" /></Button>
        </div>
      )}
    </div>
  );
};

const LearningDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<Record<string, SubTopic[]>>({});
  const [loading, setLoading] = useState(true);
  const [newSubTopic, setNewSubTopic] = useState("");
  const [showAddSub, setShowAddSub] = useState<string | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [showAddTopic, setShowAddTopic] = useState<number | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [addingTopic, setAddingTopic] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [weekNumbers, setWeekNumbers] = useState<number[]>([]);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchData = async () => {
    if (!user || !slug) return;
    const { data: j } = await supabase.from("learning_journeys").select("*").eq("id", slug).eq("user_id", user.id).single();
    if (j) setJourney(j as any);
    const { data: t } = await supabase.from("topics").select("*").eq("journey_id", slug).order("sort_order");
    if (t) {
      setTopics(t as any);
      const uniqueWeeks = Array.from(new Set(t.filter(topic => topic.week_number !== null).map(topic => topic.week_number as number))).sort((a, b) => a - b);
      setWeekNumbers(uniqueWeeks);
    }
    if (t && t.length > 0) {
      const topicIds = (t as any[]).map((x) => x.id);
      const { data: subs } = await supabase.from("sub_topics").select("*").in("topic_id", topicIds).order("sort_order");
      if (subs) {
        const grouped: Record<string, SubTopic[]> = {};
        (subs as any[]).forEach((s) => { if (!grouped[s.topic_id]) grouped[s.topic_id] = []; grouped[s.topic_id].push(s); });
        setSubTopics(grouped);
      }
      const { data: entries } = await supabase.from("time_entries").select("*").in("topic_id", topicIds).order("created_at", { ascending: true });
      if (entries) setTimeEntries(entries as any);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, slug]);

  const toggleComplete = async (topic: Topic) => {
    const newVal = !topic.is_completed;
    await supabase.from("topics").update({ is_completed: newVal } as any).eq("id", topic.id);
    if (newVal && user) {
      await supabase.from("points_log").insert({ user_id: user.id, topic_id: topic.id, points: topic.points_value, reason: `Completed: ${topic.title}` } as any);
      const { data: profileData } = await supabase.from("profiles").select("total_points").eq("user_id", user.id).single();
      await supabase.from("profiles").update({ total_points: (profileData?.total_points || 0) + topic.points_value } as any).eq("user_id", user.id);
      toast({ title: `+${topic.points_value} points!`, description: `Completed "${topic.title}"` });
      refreshProfile();
    } else if (!newVal && user) {
      const { data: profileData } = await supabase.from("profiles").select("total_points").eq("user_id", user.id).single();
      await supabase.from("profiles").update({ total_points: Math.max(0, (profileData?.total_points || 0) - topic.points_value) } as any).eq("user_id", user.id);
      refreshProfile();
    }
    fetchData();
  };

  const addSubTopic = async (topicId: string) => {
    if (!newSubTopic.trim() || !user) return;
    await supabase.from("sub_topics").insert({ topic_id: topicId, user_id: user.id, title: newSubTopic.trim(), sort_order: (subTopics[topicId]?.length || 0) } as any);
    setNewSubTopic(""); setShowAddSub(null); fetchData();
  };

  const addNewTopic = async (weekNumber: number | null) => {
    if (!newTopicTitle.trim() || !user || !slug) return;
    setAddingTopic(true);
    const weekTopics = topics.filter(t => t.week_number === weekNumber);
    const maxSort = weekTopics.length > 0 ? Math.max(...weekTopics.map(t => t.sort_order)) + 1 : 0;
    await supabase.from("topics").insert({ journey_id: slug, user_id: user.id, title: newTopicTitle.trim(), week_number: weekNumber, sort_order: maxSort, points_value: 10 } as any);
    setNewTopicTitle(""); setShowAddTopic(null); setAddingTopic(false);
    toast({ title: "Topic added!" }); fetchData();
  };

  const handleUpdateTopicTitle = async (topicId: string, title: string) => {
    if (!title.trim() || !user) return;

    // Optimistic update
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, title: title.trim() } : t));
    setEditingTopicId(null);

    const { error } = await supabase.from("topics").update({ title: title.trim() } as any).eq("id", topicId);
    if (error) {
      toast({ title: "Error", description: "Failed to update topic name", variant: "destructive" });
      fetchData(); // Rollback
    } else {
      toast({ title: "Success", description: "Topic name updated" });
    }
  };

  const addNewWeek = () => {
    const nextWeek = weekNumbers.length > 0 ? Math.max(...weekNumbers) + 1 : 1;
    setWeekNumbers(prev => [...prev, nextWeek]);
    toast({ title: "New week added!" });
  };

  const deleteWeek = async (weekNumber: number) => {
    // Move topics in this week to unassigned
    const topicsInWeek = topics.filter(t => t.week_number === weekNumber);
    if (topicsInWeek.length > 0) {
      await Promise.all(topicsInWeek.map(t => supabase.from("topics").update({ week_number: null } as any).eq("id", t.id)));
    }
    setWeekNumbers(prev => prev.filter(w => w !== weekNumber));
    toast({ title: `Week ${weekNumber} removed`, description: "Topics moved to Unassigned" });
    fetchData();
  };

  const deleteTopic = async (topicId: string) => {
    if (!user) return;
    await Promise.all([
      supabase.from("sub_topics").delete().eq("topic_id", topicId),
      supabase.from("time_entries").delete().eq("topic_id", topicId),
      supabase.from("topic_documents").delete().eq("topic_id", topicId),
      supabase.from("topic_links" as any).delete().eq("topic_id", topicId),
      supabase.from("points_log").delete().eq("topic_id", topicId),
    ]);
    await supabase.from("topics").delete().eq("id", topicId);
    toast({ title: "Topic deleted" }); fetchData();
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Find the active topic
    const activeTopic = topics.find(t => t.id === activeId);
    if (!activeTopic) return;

    // Determine the container
    let overWeekNumber: number | null = null;
    const overTopic = topics.find(t => t.id === overId);

    if (overId.toString().startsWith("week-")) {
      overWeekNumber = parseInt(overId.toString().replace("week-", ""));
    } else if (overId === "unassigned") {
      overWeekNumber = null;
    } else if (overTopic) {
      overWeekNumber = overTopic.week_number;
    } else {
      return;
    }

    if (activeTopic.week_number !== overWeekNumber) {
      const activeIndex = topics.findIndex(t => t.id === activeId);
      const overIndex = overTopic ? topics.findIndex(t => t.id === overId) : topics.length;

      setTopics(prev => {
        const newTopics = [...prev];
        const updatedTopic = { ...prev[activeIndex], week_number: overWeekNumber };
        newTopics.splice(activeIndex, 1);
        newTopics.splice(overIndex, 0, updatedTopic);
        return newTopics;
      });
    } else if (overTopic) {
      // Intra-week reordering
      const activeIndex = topics.findIndex(t => t.id === activeId);
      const overIndex = topics.findIndex(t => t.id === overId);
      if (activeIndex !== overIndex) {
        setTopics(prev => arrayMove(prev, activeIndex, overIndex));
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    // Persist all topics sort order and week number
    const updates = topics.map((t, i) =>
      supabase.from("topics").update({
        week_number: t.week_number,
        sort_order: i
      } as any).eq("id", t.id)
    );

    await Promise.all(updates);
    toast({ title: "Order saved" });
  };

  const moveWeek = async (weekNumber: number, direction: 'up' | 'down') => {
    const index = weekNumbers.indexOf(weekNumber);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === weekNumbers.length - 1) return;

    const newWeekNumbers = [...weekNumbers];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newWeekNumbers[index], newWeekNumbers[targetIndex]] = [newWeekNumbers[targetIndex], newWeekNumbers[index]];

    // In a real database, we'd need to swap week_number values of all topics in these weeks
    const targetWeekNumber = newWeekNumbers[index];

    const week1Topics = topics.filter(t => t.week_number === weekNumber);
    const week2Topics = topics.filter(t => t.week_number === targetWeekNumber);

    // Using a very large temporary offset to avoid unique constraint if any
    const tempOffset = 1000000;

    await Promise.all(week1Topics.map(t => supabase.from("topics").update({ week_number: weekNumber + tempOffset } as any).eq("id", t.id)));
    await Promise.all(week2Topics.map(t => supabase.from("topics").update({ week_number: weekNumber } as any).eq("id", t.id)));
    await Promise.all(week1Topics.map(t => supabase.from("topics").update({ week_number: targetWeekNumber } as any).eq("id", t.id)));

    setWeekNumbers(newWeekNumbers);
    toast({ title: "Weeks reordered" });
    fetchData();
  };

  // Stats
  const totalTimeSeconds = useMemo(() => timeEntries.reduce((sum, e) => sum + e.duration_seconds, 0), [timeEntries]);
  const totalHours = Math.floor(totalTimeSeconds / 3600);
  const totalMinutes = Math.floor((totalTimeSeconds % 3600) / 60);
  const weeklyChartData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now); date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split("T")[0];
      const dayTotal = timeEntries.filter((e) => e.created_at.startsWith(dayStr)).reduce((sum, e) => sum + e.duration_seconds, 0);
      result.push({ day: days[date.getDay()], hours: +(dayTotal / 3600).toFixed(1) });
    }
    return result;
  }, [timeEntries]);
  const thisWeekTotal = useMemo(() => weeklyChartData.reduce((s, d) => s + d.hours, 0), [weeklyChartData]);
  const studyStreak = useMemo(() => {
    const uniqueDays = new Set(timeEntries.map((e) => e.created_at.split("T")[0]));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (uniqueDays.has(d.toISOString().split("T")[0])) { streak++; } else if (i > 0) break;
    }
    return streak;
  }, [timeEntries]);
  const longestStreak = useMemo(() => {
    if (timeEntries.length === 0) return 0;
    const sortedDays = [...new Set(timeEntries.map((e) => e.created_at.split("T")[0]))].sort();
    let max = 1, curr = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]); const next = new Date(sortedDays[i]);
      const diff = (next.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) { curr++; max = Math.max(max, curr); } else curr = 1;
    }
    return max;
  }, [timeEntries]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1"><Skeleton className="h-7 w-64 mb-2" /><Skeleton className="h-4 w-40" /></div>
        </div>
        <div className="p-5 rounded-2xl bg-card shadow-card space-y-3">
          <Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (<div key={i} className="p-5 rounded-2xl bg-card shadow-card space-y-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-16" /></div>))}
        </div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Learning journey not found.</p>
        <Link to="/app/learning"><Button variant="outline" className="rounded-xl gap-2"><ArrowLeft className="w-4 h-4" /> Back to Journeys</Button></Link>
      </div>
    );
  }

  const completedCount = topics.filter((t) => t.is_completed).length;
  const progress = topics.length ? Math.round((completedCount / topics.length) * 100) : 0;

  const groupedTopics = {
    unassigned: topics.filter(t => t.week_number === null),
    ...weekNumbers.reduce((acc, week) => {
      acc[week] = topics.filter(t => t.week_number === week);
      return acc;
    }, {} as Record<number, Topic[]>)
  };

  const navigateToTopic = (topic: Topic) => { navigate(`/app/learning/${slug}/topic/${topic.id}`); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Link to="/app/learning">
          <Button variant="outline" size="icon" className="rounded-xl h-10 w-10"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight truncate">{journey.title}</h1>
          {journey.description && <p className="text-sm text-muted-foreground truncate">{journey.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addNewWeek} className="rounded-xl px-4 h-10 gap-2">
            <Plus className="w-4 h-4" /> Add Week
          </Button>
          {journey.end_date && (
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs shrink-0 flex items-center">
              <Calendar className="w-3 h-3 mr-1" /> Due {new Date(journey.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </Badge>
          )}
        </div>
      </div>

      {/* Progress */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-5 rounded-2xl bg-card shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Overall Progress</h3>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }}
            className={`h-full rounded-full ${progress === 100 ? "bg-primary" : "bg-chart-purple"}`} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{completedCount} of {topics.length} topics completed</p>
      </motion.div>

      {/* Activity Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-4 sm:p-5 rounded-2xl bg-card shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-1">Completion Rate</p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl sm:text-3xl font-bold text-foreground">{progress}%</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-semibold text-foreground">{completedCount}/{topics.length}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="p-4 sm:p-5 rounded-2xl bg-card shadow-card">
          <p className="text-xs font-medium text-muted-foreground mb-1">Total Time Spent</p>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-2xl sm:text-3xl font-bold text-foreground">{totalHours > 0 ? `${totalHours}h` : ""} {totalMinutes}m</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">This Week: {thisWeekTotal.toFixed(1)}H</p>
          <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData} barSize={14}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="hours" radius={[4, 4, 4, 4]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="p-4 sm:p-5 rounded-2xl bg-card shadow-card sm:col-span-2 md:col-span-1">
          <p className="text-xs font-medium text-muted-foreground mb-1">Study Streak</p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl sm:text-3xl font-bold text-foreground">{studyStreak} {studyStreak === 1 ? "Day" : "Days"}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span>Longest Streak</span>
            <span className="font-semibold text-foreground">{longestStreak} days</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: Math.min(longestStreak, 10) }).map((_, i) => (
              <div key={i} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${i < studyStreak ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                <div className="flex flex-col items-center leading-none">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <CheckCircle2 className="w-2.5 h-2.5 mt-0.5" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {weekNumbers.map((week) => (
            <motion.div key={week} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-5 rounded-2xl bg-card shadow-card group">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Week {week}</h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveWeek(week, 'up')} disabled={weekNumbers.indexOf(week) === 0}>
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveWeek(week, 'down')} disabled={weekNumbers.indexOf(week) === weekNumbers.length - 1}>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{groupedTopics[week]?.filter(t => t.is_completed).length || 0}/{groupedTopics[week]?.length || 0}</Badge>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setShowAddTopic(week)}>
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteWeek(week)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <SortableContext id={`week-${week}`} items={groupedTopics[week]?.map(t => t.id) || []} strategy={verticalListSortingStrategy}>
                <div className="space-y-1 min-h-[50px]">
                  {groupedTopics[week]?.map((topic) => (
                    <SortableTopicRow key={topic.id} topic={topic} subTopics={subTopics[topic.id] || []}
                      onToggle={() => toggleComplete(topic)}
                      onSelect={() => navigateToTopic(topic)}
                      onAddSub={() => setShowAddSub(topic.id)}
                      onDelete={() => deleteTopic(topic.id)}
                      showAddSub={showAddSub === topic.id}
                      newSubTopic={newSubTopic}
                      setNewSubTopic={setNewSubTopic}
                      onSaveSub={() => addSubTopic(topic.id)}
                      onCancelSub={() => setShowAddSub(null)}
                      isEditing={editingTopicId === topic.id}
                      editingTitle={editingTitle}
                      onStartEdit={(title) => { setEditingTopicId(topic.id); setEditingTitle(title); }}
                      onCancelEdit={() => setEditingTopicId(null)}
                      onUpdateTitle={(title) => handleUpdateTopicTitle(topic.id, title)}
                    />
                  ))}
                  {groupedTopics[week]?.length === 0 && (
                    <div className="h-10 border-2 border-dashed border-muted rounded-xl flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-widest">
                      Empty Week
                    </div>
                  )}
                </div>
              </SortableContext>

              {showAddTopic === week && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Input placeholder="New topic title..." value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addNewTopic(week)} className="text-sm" autoFocus />
                  <Button size="sm" onClick={() => addNewTopic(week)} disabled={!newTopicTitle.trim() || addingTopic} className="rounded-xl gap-1.5">
                    {addingTopic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAddTopic(null); setNewTopicTitle(""); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </motion.div>
          ))}

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 sm:p-5 rounded-2xl bg-card shadow-card ${groupedTopics.unassigned.length === 0 ? "hidden" : ""}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Unassigned Topics</h3>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setShowAddTopic(-1)}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            <SortableContext id="unassigned" items={groupedTopics.unassigned.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1 min-h-[50px]">
                {groupedTopics.unassigned.map((topic) => (
                  <SortableTopicRow key={topic.id} topic={topic} subTopics={subTopics[topic.id] || []}
                    onToggle={() => toggleComplete(topic)}
                    onSelect={() => navigateToTopic(topic)}
                    onAddSub={() => setShowAddSub(topic.id)}
                    onDelete={() => deleteTopic(topic.id)}
                    showAddSub={showAddSub === topic.id}
                    newSubTopic={newSubTopic}
                    setNewSubTopic={setNewSubTopic}
                    onSaveSub={() => addSubTopic(topic.id)}
                    onCancelSub={() => setShowAddSub(null)}
                    isEditing={editingTopicId === topic.id}
                    editingTitle={editingTitle}
                    onStartEdit={(title) => { setEditingTopicId(topic.id); setEditingTitle(title); }}
                    onCancelEdit={() => setEditingTopicId(null)}
                    onUpdateTitle={(title) => handleUpdateTopicTitle(topic.id, title)}
                  />
                ))}
              </div>
            </SortableContext>
            {showAddTopic === -1 && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <Input placeholder="New topic title..." value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNewTopic(null)} className="text-sm" autoFocus />
                <Button size="sm" onClick={() => addNewTopic(null)} disabled={!newTopicTitle.trim() || addingTopic} className="rounded-xl gap-1.5">
                  {addingTopic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddTopic(null); setNewTopicTitle(""); }}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </motion.div>

          {groupedTopics.unassigned.length === 0 && (
            <Button variant="ghost" onClick={() => setShowAddTopic(-1)} className="w-full border-2 border-dashed border-muted rounded-2xl py-8 text-muted-foreground hover:bg-muted/50 transition-colors">
              <Plus className="w-4 h-4 mr-2" /> Add Unassigned Topic
            </Button>
          )}
        </div>
      </DndContext>
    </div>
  );
};

export default LearningDetailPage;
