import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Plus, X, Sparkles, Loader2, ArrowLeft, ArrowRight, GripVertical, BookOpen, Clock, CheckCircle2, FileText, CalendarIcon, Rocket, HelpCircle, Gauge } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, addWeeks, differenceInWeeks, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import UpgradeModal from "@/components/dashboard/UpgradeModal";
import {
  DndContext,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableTopicItem = ({ id, title, index }: { id: string; title: string; index: number }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition ?? "transform 200ms ease",
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : ("auto" as any),
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-background border border-border hover:border-primary/30 cursor-grab active:cursor-grabbing transition-colors group">
      <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
      <span className="text-xs font-medium text-muted-foreground w-5 shrink-0 text-center">{index + 1}</span>
      <span className="text-sm text-foreground truncate flex-1">{title}</span>
    </div>
  );
};

const DroppableWeek = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn("min-h-[40px] space-y-1 transition-colors rounded-lg p-1", isOver && "bg-primary/5")}>
      {children}
    </div>
  );
};

const STEP_LABELS = ["Basic Info", "Content", "Schedule"];

const PLAN_LIMITS: Record<string, number> = { free: 2, paid: Infinity };

const CreateJourneyPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [limitChecked, setLimitChecked] = useState(false);
  const [overLimit, setOverLimit] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [outlineMode, setOutlineMode] = useState<"manual" | "ai" | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [endDate, setEndDate] = useState<Date | undefined>(addWeeks(new Date(), 6));
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [weeklyPlan, setWeeklyPlan] = useState<Record<number, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Check plan limit on mount
  useEffect(() => {
    if (!user || !profile) return;
    const checkLimit = async () => {
      const { count } = await supabase
        .from("learning_journeys")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      const plan = profile.plan || "free";
      const limit = PLAN_LIMITS[plan] ?? 2;
      const isOver = (count ?? 0) >= limit;
      setOverLimit(isOver);
      setLimitChecked(true);
      if (isOver) setUpgradeOpen(true);
    };
    checkLimit();
  }, [user, profile]);

  const startDate = new Date();
  const totalWeeks = endDate ? Math.max(1, differenceInWeeks(endDate, startDate)) : 4;
  const totalDays = endDate ? differenceInDays(endDate, startDate) : 28;
  const totalHours = Math.round((totalDays * dailyMinutes) / 60);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic("");
    }
  };

  const removeTopic = (t: string) => setTopics(topics.filter((x) => x !== t));

  const generateWithAI = async () => {
    setAiLoading(true);
    try {
      // 1. Check for API key (prioritizing Frontend .env for reliability)
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

      if (apiKey) {
        // Direct Call (Bypasses Edge Function)
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are a professional learning curriculum designer. You generate structured learning outlines. You MUST respond with a JSON object."
              },
              {
                role: "user",
                content: `Generate a structured learning outline for: "${title}". 
                Respond with a JSON object containing a property "topics" which is an array of 6-12 subtopic strings. 
                Example: { "topics": ["Introduction to HTML", "CSS for Beginners", "Mastering JavaScript Basics"] }`
              }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`OpenAI Error: ${response.status}`);
        }

        const data = await response.json();
        const content = JSON.parse(data.choices[0].message.content);
        const outline = content.topics || content.outline || content.curriculum || [];
        
        if (outline.length > 0) {
          setTopics(outline);
          toast({ title: "Outline generated!", description: `${outline.length} topics created with OpenAI.` });
        } else {
          throw new Error("No topics found in AI response");
        }
      } else {
        // Fallback to Edge function if Key isn't in .env
        const { data, error } = await supabase.functions.invoke("generate-outline", { body: { topic: title } });
        if (error) throw error;
        if (data?.outline) {
          setTopics(data.outline);
          toast({ title: "Outline generated!", description: `${data.outline.length} topics created by AI.` });
        }
      }
    } catch (e: any) {
      console.error("AI Generation Error:", e);
      toast({ 
        title: "AI Generation Error", 
        description: e.message === "OpenAI Error: 401" ? "Invalid API Key. Please check your .env" : e.message || "Failed to generate outline", 
        variant: "destructive" 
      });
    } finally {
      setAiLoading(false);
    }
  };

  const autoDistribute = () => {
    const plan: Record<number, string[]> = {};
    const perWeek = Math.ceil(topics.length / totalWeeks);
    topics.forEach((t, i) => {
      const week = Math.floor(i / perWeek) + 1;
      if (!plan[week]) plan[week] = [];
      plan[week].push(t);
    });
    setWeeklyPlan(plan);
  };

  const findContainer = (topicTitle: string): string => {
    for (const [week, items] of Object.entries(weeklyPlan)) {
      if (items.includes(topicTitle)) return `week-${week}`;
    }
    return "unassigned";
  };

  const getUnassignedTopics = () =>
    topics.filter((t) => !Object.values(weeklyPlan).flat().includes(t));

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeTitle = active.id as string;
    const overId = over.id as string;
    const sourceContainer = findContainer(activeTitle);
    let targetContainer = overId.startsWith("week-") || overId === "unassigned" ? overId : findContainer(overId);
    if (sourceContainer === targetContainer) return;

    setWeeklyPlan((prev) => {
      const newPlan = { ...prev };
      if (sourceContainer.startsWith("week-")) {
        const srcWeek = parseInt(sourceContainer.replace("week-", ""));
        newPlan[srcWeek] = (newPlan[srcWeek] || []).filter((t) => t !== activeTitle);
      }
      if (targetContainer.startsWith("week-")) {
        const tgtWeek = parseInt(targetContainer.replace("week-", ""));
        if (!newPlan[tgtWeek]) newPlan[tgtWeek] = [];
        if (!newPlan[tgtWeek].includes(activeTitle)) {
          const overIndex = newPlan[tgtWeek].indexOf(overId);
          if (overIndex >= 0) newPlan[tgtWeek].splice(overIndex, 0, activeTitle);
          else newPlan[tgtWeek].push(activeTitle);
        }
      }
      return newPlan;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activeTitle = active.id as string;
    const overId = over.id as string;
    const sourceContainer = findContainer(activeTitle);
    let targetContainer = overId.startsWith("week-") || overId === "unassigned" ? overId : findContainer(overId);

    if (sourceContainer === targetContainer && sourceContainer.startsWith("week-")) {
      const weekNum = parseInt(sourceContainer.replace("week-", ""));
      setWeeklyPlan((prev) => {
        const items = [...(prev[weekNum] || [])];
        const oldIndex = items.indexOf(activeTitle);
        const newIndex = items.indexOf(overId);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          return { ...prev, [weekNum]: arrayMove(items, oldIndex, newIndex) };
        }
        return prev;
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: journey, error: jErr } = await supabase
        .from("learning_journeys")
        .insert({
          user_id: user.id,
          title,
          description,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate?.toISOString().split("T")[0],
        } as any)
        .select()
        .single();

      if (jErr) throw jErr;

      const topicInserts = topics.map((t, i) => {
        let weekNum: number | null = null;
        for (const [week, items] of Object.entries(weeklyPlan)) {
          if (items.includes(t)) { weekNum = parseInt(week); break; }
        }
        return {
          journey_id: (journey as any).id,
          user_id: user.id,
          title: t,
          week_number: weekNum,
          sort_order: i,
          points_value: 10,
        };
      });

      if (topicInserts.length > 0) {
        const { error: tErr } = await supabase.from("topics").insert(topicInserts as any);
        if (tErr) throw tErr;
      }

      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Journey Created",
        message: `Your learning journey "${title}" with ${topics.length} topics has been created!`,
        type: "success",
      } as any);

      toast({ title: "Journey created!", description: "Your learning path is ready." });
      
      // Trigger Journey Created Email
      try {
        await supabase.functions.invoke("send-email", {
          body: { 
            to: user?.email, 
            type: "journey_created",
            data: { title, topics }
          }
        });
      } catch (e) {
        console.error("Failed to send journey created email:", e);
      }

      navigate("/app/learning");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return title.trim().length > 0;
    if (step === 2) return topics.length > 0;
    return true;
  };

  const getPaceIntensity = () => {
    if (dailyMinutes <= 30) return { label: "Light", dots: 1 };
    if (dailyMinutes <= 60) return { label: "Moderate", dots: 2 };
    if (dailyMinutes <= 120) return { label: "Intense", dots: 3 };
    return { label: "Extreme", dots: 4 };
  };

  const pace = getPaceIntensity();
  const unassignedTopics = getUnassignedTopics();

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} Mins`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} Hour${h > 1 ? "s" : ""}`;
  };

  if (limitChecked && overLimit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Journey Limit Reached</h2>
          <p className="text-muted-foreground text-sm mb-4">
            You've used all your available learning journeys on your current plan.
          </p>
          <Button onClick={() => setUpgradeOpen(true)}>Upgrade to Create More</Button>
        </div>
        <UpgradeModal open={upgradeOpen} onOpenChange={(open) => {
          setUpgradeOpen(open);
          if (!open) navigate("/app/learning");
        }} />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-0 mb-8 pt-2">
        {STEP_LABELS.map((label, i) => {
          const s = i + 1;
          const isActive = s === step;
          const isDone = s < step;
          return (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2",
                    isDone && "bg-primary border-primary text-primary-foreground",
                    isActive && "bg-primary border-primary text-primary-foreground",
                    !isActive && !isDone && "bg-card border-border text-muted-foreground"
                  )}
                  animate={{
                    scale: isActive ? [1, 1.15, 1] : 1,
                    boxShadow: isActive ? "0 0 0 6px hsla(84, 81%, 44%, 0.15)" : "0 0 0 0px hsla(84, 81%, 44%, 0)",
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  {isDone ? (
                    <motion.span
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </motion.span>
                  ) : s}
                </motion.div>
                <motion.span
                  className="text-xs font-semibold"
                  animate={{ color: (isActive || isDone) ? "hsl(84, 81%, 44%)" : "hsl(220, 9%, 46%)" }}
                  transition={{ duration: 0.3 }}
                >{label}</motion.span>
              </div>
              {i < 2 && (
                <div className="w-20 sm:w-32 h-0.5 mx-2 mt-[-18px] bg-border overflow-hidden rounded-full">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: s < step ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Journey Summary (collapsed at top) */}
      <div className="lg:hidden mb-4">
        <div className="bg-card rounded-xl border border-border shadow-card px-4 py-3 flex items-center gap-3 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">{title || "New Journey"}</span>
          </div>
          {topics.length > 0 && (
            <Badge variant="outline" className="shrink-0 text-[10px]">{topics.length} topics</Badge>
          )}
          {step >= 3 && (
            <>
              <Badge variant="outline" className="shrink-0 text-[10px]">{totalDays}d</Badge>
              <Badge variant="outline" className="shrink-0 text-[10px]">{dailyMinutes}m/day</Badge>
            </>
          )}
        </div>
      </div>

      {/* Main content: two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - main form */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-2xl border border-border shadow-card p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-1">What do you want to learn?</h2>
                    <p className="text-sm text-muted-foreground">Give your learning journey a clear name and optional description.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Journey Title</label>
                      <Input
                        placeholder="e.g. Advanced React Patterns, Machine Learning..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="h-13 text-base rounded-xl"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Description (optional)</label>
                      <Input
                        placeholder="Briefly describe your learning goals..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-13 text-base rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Quick suggestions:</p>
                    <div className="flex gap-2 flex-wrap">
                      {["Web Development", "Data Science", "UI/UX Design", "Digital Marketing"].map((s) => (
                        <button key={s} onClick={() => setTitle(s)}
                          className="px-3 py-1.5 rounded-full text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Content/Topics */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-5">
                  {!outlineMode ? (
                    <>
                      <div className="mb-2">
                        <h2 className="text-xl font-bold text-foreground mb-1">Build Your Content</h2>
                        <p className="text-sm text-muted-foreground">How would you like to create your outline for "{title}"?</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* AI Option */}
                        <motion.button
                          whileHover={{ scale: 1.02, y: -4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setOutlineMode("ai");
                            generateWithAI();
                          }}
                          className="relative p-6 rounded-2xl border-2 border-primary/20 bg-primary/5 text-left transition-all hover:border-primary/50 hover:shadow-lg group overflow-hidden"
                        >
                          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <h3 className="font-bold text-foreground text-lg mb-1 flex items-center gap-2">
                            A.I. Generation
                            <Badge className="bg-primary text-primary-foreground text-[10px] scale-90 px-1.5 py-0 border-0">MAGIC</Badge>
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">Let AI design a structured learning path with 8-12 progressive topics for you.</p>
                        </motion.button>

                        {/* Manual Option */}
                        <motion.button
                          whileHover={{ scale: 1.02, y: -4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setOutlineMode("manual")}
                          className="p-6 rounded-2xl border-2 border-border bg-card text-left transition-all hover:border-border/80 hover:shadow-lg group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 text-muted-foreground group-hover:text-foreground transition-colors group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6" />
                          </div>
                          <h3 className="font-bold text-foreground text-lg mb-1">Standard Entry</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">Manually add and organize topics yourself if you already have a plan.</p>
                        </motion.button>
                      </div>
                    </>
                  ) : outlineMode === "ai" && aiLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-primary/20 animate-ping absolute inset-0" />
                        <div className="w-16 h-16 rounded-full border-t-2 border-primary animate-spin" />
                        <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-lg">Generating Your Path...</h3>
                        <p className="text-sm text-muted-foreground">Consulting A.I. to build the perfect roadmap for you.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-bold text-foreground mb-1">
                            {outlineMode === "ai" ? "Verify AI Outline" : "Your Topics"}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {outlineMode === "ai"
                              ? `A.I. generated ${topics.length} topics for your journey.`
                              : `Add topics to your outline for "${title}"`}
                          </p>
                        </div>
                        {outlineMode === "ai" && (
                          <Button variant="ghost" size="sm" onClick={() => setOutlineMode(null)} className="text-xs text-muted-foreground hover:text-foreground">
                            <X className="w-3.5 h-3.5 mr-1" /> Reset
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2 mb-4">
                        <Input
                          placeholder="Add topic..."
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addTopic()}
                          className="h-10 rounded-xl"
                        />
                        <Button size="sm" onClick={addTopic} className="rounded-xl shrink-0 h-10 px-4">Add</Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[350px] overflow-y-auto pr-1">
                        <AnimatePresence>
                          {topics.map((t, i) => (
                            <motion.div
                              key={`${t}-${i}`}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="group flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-background hover:border-primary/30 transition-all shadow-sm"
                            >
                              <span className="text-[10px] font-bold text-muted-foreground/60 w-4">{i + 1}</span>
                              <span className="text-sm text-foreground truncate flex-1">{t}</span>
                              <X
                                className="w-4 h-4 text-muted-foreground/20 group-hover:text-destructive cursor-pointer transition-colors"
                                onClick={() => removeTopic(t)}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {topics.length === 0 && (
                          <div className="col-span-full py-10 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 opacity-50">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                            <p className="text-sm font-medium">No topics yet</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* Step 3: Schedule */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-1">Finalize Your Schedule</h2>
                    <p className="text-sm text-muted-foreground">Pick a target date and set your daily study time.</p>
                  </div>

                  {/* Target Completion Date */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Target Completion Date</label>
                    <div className="border border-border rounded-2xl p-4 bg-background inline-block">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => date < new Date()}
                        className="pointer-events-auto"
                      />
                    </div>
                  </div>

                  {/* Daily Study Duration Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daily Study Duration</label>
                      <span className="text-sm font-bold text-primary">{formatDuration(dailyMinutes)}</span>
                    </div>
                    <Slider
                      value={[dailyMinutes]}
                      onValueChange={(v) => setDailyMinutes(v[0])}
                      min={15}
                      max={240}
                      step={15}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>15m</span>
                      <span>1h</span>
                      <span>2h</span>
                      <span>3h</span>
                      <span>4h</span>
                    </div>
                  </div>

                  {/* Weekly Schedule DnD */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Weekly Topic Schedule</label>
                      <Button variant="outline" size="sm" onClick={autoDistribute} className="rounded-xl text-xs gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Auto-distribute
                      </Button>
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={rectIntersection}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => {
                          const weekItems = weeklyPlan[week] || [];
                          return (
                            <div key={week} className="p-3 rounded-xl border border-border bg-background">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-foreground">Week {week}</p>
                                <span className="text-[10px] text-muted-foreground">{weekItems.length} topic{weekItems.length !== 1 ? "s" : ""}</span>
                              </div>
                              <DroppableWeek id={`week-${week}`}>
                                <SortableContext items={weekItems} strategy={verticalListSortingStrategy}>
                                  {weekItems.length > 0 ? weekItems.map((t, idx) => (
                                    <SortableTopicItem key={t} id={t} title={t} index={idx} />
                                  )) : (
                                    <p className="text-xs text-muted-foreground italic py-2 text-center">Drop topics here</p>
                                  )}
                                </SortableContext>
                              </DroppableWeek>
                            </div>
                          );
                        })}
                      </div>

                      {unassignedTopics.length > 0 && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-dashed border-border mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Unassigned — Drag to a week above</p>
                          <DroppableWeek id="unassigned">
                            <SortableContext items={unassignedTopics} strategy={verticalListSortingStrategy}>
                              {unassignedTopics.map((t, idx) => (
                                <SortableTopicItem key={t} id={t} title={t} index={idx} />
                              ))}
                            </SortableContext>
                          </DroppableWeek>
                        </div>
                      )}

                      <DragOverlay>
                        {activeId ? (
                          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/10 text-sm text-foreground shadow-elevated border border-primary/30">
                            <GripVertical className="w-4 h-4 text-primary shrink-0" />
                            <span>{activeId}</span>
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  </div>

                  {/* Flexible schedule note */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                    <HelpCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">Need a more flexible schedule? You can pause your journey anytime later.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation footer */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  if (step === 1) navigate("/app/learning");
                  else if (step === 2 && outlineMode) setOutlineMode(null);
                  else setStep(step - 1);
                }}
                className="gap-1.5 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" />
                {step === 1 ? "Back to Learning" : step === 2 && !outlineMode ? "Back to Basic Info" : `Back to ${STEP_LABELS[step - 2]}`}
              </Button>
              {step < 3 ? (
                <Button
                  onClick={() => {
                    if (step === 2) autoDistribute();
                    setStep(step + 1);
                  }}
                  disabled={!canProceed()}
                  className="gap-1.5 rounded-xl px-6"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl px-8 bg-primary hover:bg-primary/90">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  Create Journey
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Journey Overview (hidden on mobile, shown at top instead) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="bg-card rounded-2xl border border-border shadow-card p-6 sticky top-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-bold text-foreground">Journey Overview</h3>
            </div>

            <div className="space-y-3">
              {/* Selected Path - always show */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/50">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Selected Path</p>
                  <p className="text-base font-bold text-foreground truncate max-w-[180px]">{title || "—"}</p>
                  {topics.length > 0 && (
                    <p className="text-xs text-muted-foreground">{topics.length} topics</p>
                  )}
                </div>
              </div>

              {/* Topics count - only show after topics added */}
              {topics.length > 0 && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/50">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Content</p>
                    <p className="text-base font-bold text-foreground">{topics.length} Topics</p>
                    <p className="text-xs text-muted-foreground">Ready to schedule</p>
                  </div>
                </div>
              )}

              {/* Timeline - only show on step 3 */}
              {step >= 3 && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/50">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Timeline</p>
                    <p className="text-base font-bold text-foreground">{totalDays} Days</p>
                    <p className="text-xs text-muted-foreground">
                      Ends {endDate ? format(endDate, "MMM d, yyyy") : "—"}
                    </p>
                  </div>
                </div>
              )}

              {/* Total Commitment - only show on step 3 */}
              {step >= 3 && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/50">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Commitment</p>
                    <p className="text-base font-bold text-foreground">{totalHours} Hours</p>
                    <p className="text-xs text-muted-foreground">{dailyMinutes} mins / day</p>
                  </div>
                </div>
              )}

              {/* Pace Intensity - only show on step 3 */}
              {step >= 3 && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/50">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Gauge className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Pace Intensity</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((d) => (
                          <div key={d} className={cn("w-2.5 h-2.5 rounded-full", d <= pace.dots ? "bg-primary" : "bg-border")} />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-foreground">{pace.label}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state hint for step 1 */}
              {step === 1 && !title && (
                <div className="p-3.5 rounded-xl bg-muted/30 border border-dashed border-border text-center">
                  <p className="text-xs text-muted-foreground">Enter a title to start building your journey overview.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
};

export default CreateJourneyPage;
