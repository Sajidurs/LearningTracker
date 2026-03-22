import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, X, Sparkles, Loader2, ArrowRight, ArrowLeft, GripVertical, BookOpen, Clock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, addWeeks, differenceInWeeks } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
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

interface CreateJourneyWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const SortableTopicItem = ({ id, title, index }: { id: string; title: string; index: number }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition ?? 'transform 200ms ease',
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto' as any,
    position: 'relative' as const,
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

const STEP_LABELS = ["Name", "Topics", "Dates", "Schedule"];
const STEP_ICONS = [BookOpen, Plus, CalendarIcon, Clock];

const CreateJourneyWizard = ({ open, onOpenChange, onCreated }: CreateJourneyWizardProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [outlineMode, setOutlineMode] = useState<"manual" | "ai" | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(addWeeks(new Date(), 4));
  const [weeklyPlan, setWeeklyPlan] = useState<Record<number, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const totalWeeks = startDate && endDate ? Math.max(1, differenceInWeeks(endDate, startDate)) : 4;

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
      const { data, error } = await supabase.functions.invoke("generate-outline", { body: { topic: title } });
      if (error) throw error;
      if (data?.outline) {
        setTopics(data.outline);
        toast({ title: "Outline generated!", description: `${data.outline.length} topics created by AI.` });
      }
    } catch (e: any) {
      toast({ title: "AI Error", description: e.message || "Failed to generate outline", variant: "destructive" });
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTitle = active.id as string;
    const overId = over.id as string;
    const sourceContainer = findContainer(activeTitle);

    let targetContainer: string;
    if (overId.startsWith("week-") || overId === "unassigned") {
      targetContainer = overId;
    } else {
      targetContainer = findContainer(overId);
    }

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
          if (overIndex >= 0) {
            newPlan[tgtWeek].splice(overIndex, 0, activeTitle);
          } else {
            newPlan[tgtWeek].push(activeTitle);
          }
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
    let targetContainer: string;
    if (overId.startsWith("week-") || overId === "unassigned") {
      targetContainer = overId;
    } else {
      targetContainer = findContainer(overId);
    }

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
          start_date: startDate?.toISOString().split("T")[0],
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

      // Create notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Journey Created",
        message: `Your learning journey "${title}" with ${topics.length} topics has been created!`,
        type: "success",
      } as any);

      toast({ title: "Journey created!", description: `"${title}" with ${topics.length} topics.` });
      onCreated();
      resetWizard();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setTitle("");
    setOutlineMode(null);
    setTopics([]);
    setNewTopic("");
    setStartDate(new Date());
    setEndDate(addWeeks(new Date(), 4));
    setWeeklyPlan({});
  };

  const canProceed = () => {
    if (step === 1) return title.trim().length > 0;
    if (step === 2) return topics.length > 0;
    if (step === 3) return startDate && endDate;
    return true;
  };

  const unassignedTopics = getUnassignedTopics();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetWizard(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Step indicator header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-semibold text-foreground mb-4">Create Learning Journey</DialogTitle>
          <div className="flex items-center gap-1">
            {STEP_LABELS.map((label, i) => {
              const StepIcon = STEP_ICONS[i];
              const s = i + 1;
              const isActive = s === step;
              const isDone = s < step;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-xs font-medium w-full",
                    isActive && "bg-primary/10 text-primary",
                    isDone && "text-primary",
                    !isActive && !isDone && "text-muted-foreground"
                  )}>
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                      isDone && "bg-primary/20 text-primary",
                      !isActive && !isDone && "bg-muted text-muted-foreground"
                    )}>
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : s}
                    </div>
                    <span className="hidden sm:block">{label}</span>
                  </div>
                  {i < 3 && <div className={cn("h-px w-4 shrink-0", s < step ? "bg-primary" : "bg-border")} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {/* Step 1: Name */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-1">What do you want to learn?</h2>
                  <p className="text-sm text-muted-foreground">Give your learning journey a clear, descriptive name.</p>
                </div>
                <Input
                  placeholder="e.g. Web Design, Machine Learning, Guitar..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-14 text-base rounded-xl"
                  autoFocus
                />
                <div className="flex gap-2 flex-wrap">
                  {["Web Development", "Data Science", "UI/UX Design", "Digital Marketing"].map((s) => (
                    <button key={s} onClick={() => setTitle(s)}
                      className="px-3 py-1.5 rounded-full text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Topics */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                {!outlineMode ? (
                  <>
                    <div>
                      <h2 className="text-base font-semibold text-foreground mb-1">Add Your Topics</h2>
                      <p className="text-sm text-muted-foreground">Build your topic list for "{title}"</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <button onClick={() => setOutlineMode("manual")}
                        className="p-6 rounded-2xl border-2 border-border hover:border-primary/50 text-center transition-all hover:shadow-card group">
                        <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center mx-auto mb-3 transition-colors">
                          <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <p className="font-semibold text-foreground">Add Topics</p>
                        <p className="text-xs text-muted-foreground mt-1">Enter topics yourself</p>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a topic..."
                            value={newTopic}
                            onChange={(e) => setNewTopic(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addTopic()}
                            className="rounded-xl"
                          />
                          <Button size="icon" onClick={addTopic} className="rounded-xl shrink-0"><Plus className="w-4 h-4" /></Button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                          {topics.map((t, i) => (
                            <Badge key={t} variant="secondary" className="gap-1.5 px-3 py-2 rounded-xl text-sm">
                              <span className="text-muted-foreground text-xs">{i + 1}.</span>
                              {t}
                              <X className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors" onClick={() => removeTopic(t)} />
                            </Badge>
                          ))}
                        </div>
                        {topics.length > 0 && (
                          <p className="text-xs text-muted-foreground">{topics.length} topic{topics.length !== 1 ? "s" : ""} added</p>
                        )}
                  </>
                )}
              </motion.div>
            )}

            {/* Step 3: Timeframe */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-1">Set your timeframe</h2>
                  <p className="text-sm text-muted-foreground">This journey will span <span className="font-semibold text-foreground">{totalWeeks} weeks</span> with {topics.length} topics.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">Start Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left rounded-xl h-12", !startDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">End Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left rounded-xl h-12", !endDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Weekly Schedule with DnD */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-foreground mb-1">Organize your schedule</h2>
                    <p className="text-sm text-muted-foreground">Drag topics between weeks to organize them</p>
                  </div>
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
                        <div key={week} className="p-3 rounded-xl border border-border bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-foreground">Week {week}</p>
                            <span className="text-[10px] text-muted-foreground">{weekItems.length} topic{weekItems.length !== 1 ? "s" : ""}</span>
                          </div>
                          <DroppableWeek id={`week-${week}`}>
                            <SortableContext items={weekItems} strategy={verticalListSortingStrategy}>
                              {weekItems.length > 0 ? (
                                weekItems.map((t, idx) => (
                                  <SortableTopicItem key={t} id={t} title={t} index={idx} />
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground italic py-2 text-center">Drop topics here</p>
                              )}
                            </SortableContext>
                          </DroppableWeek>
                        </div>
                      );
                    })}
                  </div>

                  {unassignedTopics.length > 0 && (
                    <div className="p-3 rounded-xl bg-muted/40 border border-dashed border-border">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          <Button
            variant="ghost"
            onClick={() => { if (step === 2 && outlineMode) setOutlineMode(null); else setStep(step - 1); }}
            disabled={step === 1}
            className="gap-1.5 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          {step < 4 ? (
            <Button onClick={() => { if (step === 3) autoDistribute(); setStep(step + 1); }} disabled={!canProceed()} className="gap-1.5 rounded-xl px-6">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="gap-1.5 rounded-xl px-6">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Create Journey
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateJourneyWizard;
