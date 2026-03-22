import { Plus, Gift, Lock, CheckCircle2, Star, Trash2, Trophy, Edit2, Search, History, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import confetti from "canvas-confetti";

interface Reward {
  id: string;
  title: string;
  points_cost: number;
  is_redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
}

interface PointLog {
  id: string;
  points: number;
  reason: string;
  created_at: string;
}

const CelebrationOverlay = ({ show, onDone }: { show: boolean; onDone: () => void }) => {
  useEffect(() => {
    if (show) {
      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#A3E635", "#FACC15", "#F472B6", "#818CF8"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#A3E635", "#FACC15", "#F472B6", "#818CF8"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();

      const timer = setTimeout(onDone, duration);
      return () => clearTimeout(timer);
    }
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onDone}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="text-center p-8 sm:p-12 rounded-3xl bg-card shadow-elevated max-w-sm mx-4"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-6xl sm:text-7xl mb-4"
            >
              🎉
            </motion.div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Congratulations!</h2>
            <p className="text-muted-foreground text-sm sm:text-base">You've unlocked your reward! 🎂🍰</p>
            <div className="flex justify-center gap-2 mt-4 text-3xl">
              <motion.span animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}>🎈</motion.span>
              <motion.span animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}>🧁</motion.span>
              <motion.span animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.6 }}>🎊</motion.span>
              <motion.span animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.9 }}>🍰</motion.span>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Click anywhere to close</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const RewardsPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newCost, setNewCost] = useState(100);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCost, setEditCost] = useState(100);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pointsHistory, setPointsHistory] = useState<PointLog[]>([]);

  const pointsBalance = profile?.total_points || 0;

  const fetchRewards = async () => {
    if (!user) return;
    const { data } = await supabase.from("rewards").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setRewards(data as any);
    setLoading(false);
  };

  const fetchPointsHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("points_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setPointsHistory(data as any);
  };

  useEffect(() => { fetchRewards(); fetchPointsHistory(); }, [user]);

  const createReward = async () => {
    if (!newTitle.trim() || !user) return;
    await supabase.from("rewards").insert({
      user_id: user.id,
      title: newTitle.trim(),
      points_cost: newCost,
    } as any);
    setNewTitle("");
    setNewCost(100);
    setDialogOpen(false);
    toast({ title: "Reward created!" });
    fetchRewards();
  };

  const redeemReward = async (reward: Reward) => {
    if (!user || pointsBalance < reward.points_cost) return;
    await supabase.from("profiles").update({
      total_points: pointsBalance - reward.points_cost,
    } as any).eq("user_id", user.id);
    await supabase.from("rewards").update({
      is_redeemed: true,
      redeemed_at: new Date().toISOString(),
    } as any).eq("id", reward.id);
    await supabase.from("points_log").insert({
      user_id: user.id,
      points: -reward.points_cost,
      reason: `Redeemed: ${reward.title}`,
    } as any);
    setShowCelebration(true);
    refreshProfile();
    fetchRewards();
  };

  const deleteReward = async (id: string) => {
    await supabase.from("rewards").delete().eq("id", id);
    toast({ title: "Reward deleted" });
    fetchRewards();
  };

  const openEdit = (reward: Reward) => {
    setEditingReward(reward);
    setEditTitle(reward.title);
    setEditCost(reward.points_cost);
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingReward || !editTitle.trim()) return;
    await supabase.from("rewards").update({
      title: editTitle.trim(),
      points_cost: editCost,
    } as any).eq("id", editingReward.id);
    setEditDialogOpen(false);
    setEditingReward(null);
    toast({ title: "Reward updated!" });
    fetchRewards();
  };

  const closeCelebration = useCallback(() => setShowCelebration(false), []);

  const activeRewards = rewards.filter(r => !r.is_redeemed && r.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const redeemedRewards = rewards.filter(r => r.is_redeemed && r.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex gap-5">
      <div className="flex-1 space-y-6">
      <CelebrationOverlay show={showCelebration} onDone={closeCelebration} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Rewards</h1>
          <p className="text-sm text-muted-foreground">Create rewards and redeem them with your earned points.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search rewards..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 w-48 rounded-xl"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-2">
                <Plus className="w-4 h-4" /> New Reward
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Reward</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">Reward Name</label>
                <Input
                  placeholder="e.g., Movie night, New book, Day off..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createReward()}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">Points Required</label>
                <Input
                  type="number"
                  min={1}
                  value={newCost}
                  onChange={(e) => setNewCost(parseInt(e.target.value) || 0)}
                  className="text-center font-bold text-lg"
                />
              </div>
              <Button onClick={createReward} disabled={!newTitle.trim() || newCost <= 0} className="w-full rounded-xl">
                Create Reward
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Edit Reward Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Reward</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">Reward Name</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">Points Required</label>
              <Input type="number" min={1} value={editCost} onChange={(e) => setEditCost(parseInt(e.target.value) || 0)}
                className="text-center font-bold text-lg" />
            </div>
            <Button onClick={saveEdit} disabled={!editTitle.trim() || editCost <= 0} className="w-full rounded-xl">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Points Wallet Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden"
      >
        {/* Card background with gradient - works in both light and dark */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 dark:from-sidebar-background dark:via-sidebar-background dark:to-sidebar-background" />
        <div className="absolute inset-0 opacity-20 dark:opacity-20" style={{ background: 'radial-gradient(circle at 80% 20%, hsl(var(--primary)), transparent 60%), radial-gradient(circle at 20% 80%, hsl(var(--chart-purple)), transparent 60%)' }} />
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
        
        <div className="relative z-10 p-5 sm:p-7">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Points Wallet</p>
                <p className="text-[10px] text-muted-foreground/70">Earn & redeem</p>
              </div>
            </div>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              ))}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">{pointsBalance.toLocaleString()}</span>
              <span className="text-sm font-medium text-muted-foreground">pts</span>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-border/50 dark:border-sidebar-border">
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Active</p>
              <p className="text-lg font-bold text-foreground">{activeRewards.length}</p>
            </div>
            <div className="w-px h-8 bg-border/50 dark:bg-sidebar-border" />
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Redeemed</p>
              <p className="text-lg font-bold text-foreground">{redeemedRewards.length}</p>
            </div>
            <div className="w-px h-8 bg-border/50 dark:bg-sidebar-border" />
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Status</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-primary">Active</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Active Rewards */}
      {activeRewards.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Active Rewards</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {activeRewards.map((r, i) => {
              const canAfford = pointsBalance >= r.points_cost;
              const progressPercent = Math.min(100, (pointsBalance / r.points_cost) * 100);
              const pointsNeeded = Math.max(0, r.points_cost - pointsBalance);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="p-4 sm:p-5 rounded-2xl bg-card shadow-card hover:shadow-elevated transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Gift className="w-5 h-5 text-primary shrink-0" />
                      <h3 className="font-semibold text-foreground truncate">{r.title}</h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(r)} className="p-1 rounded hover:bg-muted transition-colors">
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button onClick={() => deleteReward(r.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mb-3">
                    <Star className="w-4 h-4 text-chart-yellow" />
                    <span className="text-sm font-bold text-foreground">{r.points_cost.toLocaleString()} points</span>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">{canAfford ? "Ready to redeem!" : `${pointsNeeded.toLocaleString()} more needed`}</span>
                      <span className="font-semibold text-foreground">{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>

                  <Button
                    size="sm"
                    className="w-full rounded-full"
                    disabled={!canAfford}
                    variant={canAfford ? "default" : "secondary"}
                    onClick={() => redeemReward(r)}
                  >
                    {canAfford ? "🎉 Redeem Now" : <><Lock className="w-3.5 h-3.5 mr-1" /> Locked</>}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Redeemed Rewards */}
      {redeemedRewards.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Redeemed</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {redeemedRewards.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="p-4 sm:p-5 rounded-2xl bg-card shadow-card opacity-75"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    <h3 className="font-semibold text-foreground truncate">{r.title}</h3>
                  </div>
                  <button onClick={() => deleteReward(r.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Star className="w-3.5 h-3.5 text-chart-yellow" />
                  <span className="text-xs font-medium text-muted-foreground">{r.points_cost.toLocaleString()} points</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Redeemed {r.redeemed_at ? new Date(r.redeemed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && rewards.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center">
          <Gift className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No rewards yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first reward to stay motivated!</p>
          <Button onClick={() => setDialogOpen(true)} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" /> Create Reward
          </Button>
        </motion.div>
      )}
      </div>

      {/* Point History Sidebar */}
      <div className="hidden lg:flex flex-col w-[260px] shrink-0">
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3 sticky top-4">
          <div className="flex items-center gap-2 mb-1">
            <History className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Point History</h3>
          </div>
          {pointsHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">No history yet</p>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {pointsHistory.map((log) => {
                const isPositive = log.points > 0;
                return (
                  <div key={log.id} className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isPositive ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                      {isPositive ? <TrendingUp className="w-3 h-3 text-primary" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{log.reason}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${isPositive ? 'text-primary' : 'text-destructive'}`}>
                      {isPositive ? '+' : ''}{log.points}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;
