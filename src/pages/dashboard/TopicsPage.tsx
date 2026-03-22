import { BookOpen, ChevronRight, Calendar, CheckCircle2, Circle, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Journey {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

interface Topic {
  id: string;
  title: string;
  is_completed: boolean;
  week_number: number | null;
  day_of_week: number | null;
  sort_order: number;
  points_value: number;
}

const TopicsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchJourneys = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("learning_journeys")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setJourneys(data || []);
      setLoading(false);
    };
    fetchJourneys();
  }, [user]);

  useEffect(() => {
    if (!selectedJourney) return;
    const fetchTopics = async () => {
      setLoadingTopics(true);
      const { data } = await supabase
        .from("topics")
        .select("*")
        .eq("journey_id", selectedJourney.id)
        .order("sort_order", { ascending: true });
      setTopics(data || []);
      setLoadingTopics(false);
    };
    fetchTopics();
  }, [selectedJourney]);

  const weeklyGroups = useMemo(() => {
    const groups: Record<number, Topic[]> = {};
    topics.forEach((t) => {
      const week = t.week_number ?? 1;
      if (!groups[week]) groups[week] = [];
      groups[week].push(t);
    });
    return Object.entries(groups)
      .map(([week, items]) => ({ week: Number(week), items }))
      .sort((a, b) => a.week - b.week);
  }, [topics]);

  // Journey selection view
  if (!selectedJourney) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Weekly Planner</h1>
          <p className="text-sm text-muted-foreground">Select a learning journey to view its weekly schedule.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-6 shadow-card animate-pulse h-32" />
            ))}
          </div>
        ) : journeys.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-card p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Learning Journeys</h3>
            <p className="text-sm text-muted-foreground mb-4">Create a learning journey first to use the weekly planner.</p>
            <Button onClick={() => navigate("/app/learning")} className="rounded-xl">
              Go to Learning Journeys
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {journeys.map((journey, i) => (
              <motion.button
                key={journey.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedJourney(journey)}
                className="bg-card rounded-2xl shadow-card p-6 text-left hover:shadow-lg hover:scale-[1.01] transition-all duration-200 group border border-transparent hover:border-primary/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        journey.status === "active"
                          ? "bg-primary/10 text-primary"
                          : journey.status === "completed"
                          ? "bg-green-500/10 text-green-600"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {journey.status}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-foreground truncate mb-1">{journey.title}</h3>
                    {journey.start_date && journey.end_date && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {new Date(journey.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" — "}
                          {new Date(journey.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Weekly planner view for selected journey
  const completedCount = topics.filter((t) => t.is_completed).length;
  const totalCount = topics.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setSelectedJourney(null); setTopics([]); }}
          className="p-2 rounded-xl bg-card shadow-card hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight truncate">{selectedJourney.title}</h1>
          <p className="text-sm text-muted-foreground">Weekly learning schedule • {completedCount}/{totalCount} topics completed ({progressPct}%)</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-card rounded-2xl shadow-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Overall Progress</span>
          <span className="text-xs font-semibold text-foreground">{progressPct}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {loadingTopics ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-2xl p-6 shadow-card animate-pulse h-40" />
          ))}
        </div>
      ) : weeklyGroups.length === 0 ? (
        <div className="bg-card rounded-2xl shadow-card p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Topics Yet</h3>
          <p className="text-sm text-muted-foreground">This journey doesn't have any topics assigned to weeks.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {weeklyGroups.map(({ week, items }) => {
            const weekCompleted = items.filter((t) => t.is_completed).length;
            return (
              <motion.div
                key={week}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: week * 0.08 }}
                className="bg-card rounded-2xl shadow-card overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{week}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Week {week}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{weekCompleted}/{items.length} done</span>
                </div>
                <div className="divide-y divide-border">
                  {items.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => navigate(`/app/learning/${selectedJourney.id}`)}
                      className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-background/50 transition-colors text-left"
                    >
                      {topic.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                      )}
                      <span className={`text-sm flex-1 ${topic.is_completed ? "text-muted-foreground line-through" : "text-foreground font-medium"}`}>
                        {topic.title}
                      </span>
                      <span className="text-xs text-muted-foreground">{topic.points_value} pts</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TopicsPage;
