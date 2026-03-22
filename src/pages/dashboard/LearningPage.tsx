import { Plus, Calendar, CheckCircle2, Clock, BookOpen, Loader2, Bookmark, ArrowRight, Star, Zap, Search, Filter, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import UpgradeModal from "@/components/dashboard/UpgradeModal";
import EditJourneyModal from "@/components/dashboard/EditJourneyModal";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Journey {
  id: string;
  title: string;
  description?: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  is_favorited?: boolean;
  topic_count?: number;
  completed_count?: number;
}

const PLAN_LIMITS: Record<string, number> = { free: 2, paid: Infinity };

const LearningPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Edit/Delete state
  const [journeyToEdit, setJourneyToEdit] = useState<Journey | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [journeyToDelete, setJourneyToDelete] = useState<Journey | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchJourneys = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("learning_journeys")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const enriched = await Promise.all(
        (data as any[]).map(async (j) => {
          const { count: total } = await supabase
            .from("topics")
            .select("*", { count: "exact", head: true })
            .eq("journey_id", j.id);
          const { count: completed } = await supabase
            .from("topics")
            .select("*", { count: "exact", head: true })
            .eq("journey_id", j.id)
            .eq("is_completed", true);
          return { ...j, topic_count: total || 0, completed_count: completed || 0 };
        })
      );
      setJourneys(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { fetchJourneys(); }, [user]);

  const plan = profile?.plan || "free";
  const limit = PLAN_LIMITS[plan] ?? 2;
  const canCreate = journeys.length < limit;
  const atLimit = !canCreate;

  const handleNewClick = () => {
    if (!canCreate) {
      setUpgradeOpen(true);
      return;
    }
    navigate("/app/learning/create");
  };

  const toggleFavorite = async (e: React.MouseEvent, journey: Journey) => {
    e.preventDefault();
    e.stopPropagation();
    const newVal = !journey.is_favorited;
    setJourneys(prev => prev.map(j => j.id === journey.id ? { ...j, is_favorited: newVal } : j));
    await supabase.from("learning_journeys").update({ is_favorited: newVal } as any).eq("id", journey.id);
  };

  const handleEditClick = (e: React.MouseEvent, journey: Journey) => {
    e.preventDefault();
    e.stopPropagation();
    setJourneyToEdit(journey);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, journey: Journey) => {
    e.preventDefault();
    e.stopPropagation();
    setJourneyToDelete(journey);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!journeyToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("learning_journeys")
        .delete()
        .eq("id", journeyToDelete.id);

      if (error) throw error;

      toast({ title: "Journey deleted successfully" });
      setJourneys(prev => prev.filter(j => j.id !== journeyToDelete.id));
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setJourneyToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-card shadow-card overflow-hidden flex flex-col">
              <div className="flex flex-1">
                <div className="w-1.5 bg-muted shrink-0" />
                <div className="p-5 flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-5 rounded" />
                  </div>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="border-t border-border" />
                </div>
              </div>
              <div className="px-5 pb-5 pt-3 flex items-center justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filteredJourneys = journeys.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFav = showFavoritesOnly ? j.is_favorited : true;
    return matchesSearch && matchesFav;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Learning Journeys</h1>
          <p className="text-sm text-muted-foreground">
            {journeys.length}/{limit === Infinity ? "∞" : limit} journeys used
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[120px] max-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl text-sm"
            />
          </div>
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="icon"
            className="rounded-xl h-9 w-9 shrink-0"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            title="Filter favorites"
          >
            <Bookmark className={`w-4 h-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
          </Button>
          <Button className="rounded-xl h-9 shrink-0" size="sm" onClick={handleNewClick}>
            <Plus className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">New Learning</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Upgrade banner when at limit */}
      {atLimit && plan !== "paid" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-cta flex items-center justify-between gap-4 flex-wrap"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-foreground">Upgrade your plan to enjoy more learnings</p>
              <p className="text-xs text-primary-foreground/70">
                You've used all {limit} journeys on your {plan} plan.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shrink-0"
            onClick={() => setUpgradeOpen(true)}
          >
            Upgrade Plan
          </Button>
        </motion.div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredJourneys.map((j, i) => {
          const progress = j.topic_count ? Math.round(((j.completed_count || 0) / j.topic_count) * 100) : 0;
          const isComplete = progress === 100;
          return (
            <Link key={j.id} to={`/app/learning/${j.id}`}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl bg-card shadow-card hover:shadow-elevated transition-all duration-200 cursor-pointer active:scale-[0.98] overflow-hidden flex flex-col"
              >
                <div className="flex flex-1">
                  <div className="w-1.5 bg-primary shrink-0" />
                  <div className="p-4 sm:p-5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                        {j.status === "completed" ? "Completed" : j.status === "paused" ? "Paused" : "Active"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => toggleFavorite(e, j)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                          <Bookmark className={`w-5 h-5 ${j.is_favorited ? "text-primary fill-primary" : "text-muted-foreground"}`} />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="p-1 rounded-lg hover:bg-muted transition-colors">
                              <MoreVertical className="w-5 h-5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem onClick={(e) => handleEditClick(e, j)} className="gap-2 cursor-pointer">
                              <Edit2 className="w-4 h-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleDeleteClick(e, j)} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug mb-2">{j.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                      {j.description || `${j.topic_count || 0} topics · ${j.completed_count || 0} completed`}
                    </p>
                    <div className="border-t border-border mt-auto" />
                  </div>
                </div>
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-chart-yellow fill-chart-yellow" />
                    <span className="text-sm font-semibold text-foreground">{progress}%</span>
                  </div>
                  <Button
                    size="sm"
                    className={`rounded-full px-4 sm:px-5 gap-1.5 text-xs sm:text-sm ${isComplete ? "bg-muted text-muted-foreground hover:bg-muted" : ""}`}
                    variant={isComplete ? "secondary" : "default"}
                  >
                    {isComplete ? "Completed" : <>Continue <ArrowRight className="w-3.5 h-3.5" /></>}
                  </Button>
                </div>
              </motion.div>
            </Link>
          );
        })}

        {canCreate && (
          <div
            onClick={handleNewClick}
            className="p-5 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-all duration-200 min-h-[180px] active:scale-[0.98]"
          >
            <Plus className="w-8 h-8" />
            <span className="text-sm font-medium">Create New Learning</span>
          </div>
        )}
      </div>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />

      <EditJourneyModal
        journey={journeyToEdit}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={fetchJourneys}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the learning journey "{journeyToDelete?.title}" and all its associated topics and progress. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Journey
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LearningPage;
