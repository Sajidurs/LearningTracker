import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Clock, Target, Medal, Share2, MoreVertical, ExternalLink } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

type Timeframe = "daily" | "weekly" | "monthly" | "yearly";
type Metric = "time_spent" | "topics_completed";

interface LeaderboardRecord {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  score: number;
  rank: number;
}

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: "24h", value: "daily" },
  { label: "7D", value: "weekly" },
  { label: "30D", value: "monthly" },
  { label: "Seasonal", value: "yearly" },
];

const METRICS: { label: string; value: Metric }[] = [
  { label: "Study Time", value: "time_spent" },
  { label: "Topics Completed", value: "topics_completed" },
];

const formatTimeSpent = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>("monthly");
  const [metric, setMetric] = useState<Metric>("time_spent");

  // Fetch Leaderboard
  const { data: records, isLoading } = useQuery({
    queryKey: ["leaderboard", timeframe, metric],
    queryFn: async () => {
      // Using our new RPC function
      const { data, error } = await supabase.rpc("get_leaderboard", {
        timeframe,
        metric,
      });
      if (error) {
        console.error("Leaderboard Error:", error);
        return [];
      }
      return (data as unknown as LeaderboardRecord[]) || [];
    },
  });

  const topThree = records?.slice(0, 3) || [];
  const restOfList = records?.slice(3) || [];

  const handleShare = (record: LeaderboardRecord) => {
    const url = `${window.location.origin}/share/${record.user_id}?timeframe=${timeframe}&metric=${metric}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied!",
      description: "Share your leaderboard rank with others.",
    });
  };

  const currentRank = records?.find((r) => r.user_id === user?.id);

  // Styling helpers
  const getMedalColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-slate-300";
    if (rank === 3) return "text-amber-700";
    return "text-muted-foreground";
  };

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return "bg-yellow-400/20 text-yellow-500 border-yellow-400/30";
    if (rank === 2) return "bg-slate-300/20 text-slate-300 border-slate-300/30";
    if (rank === 3) return "bg-amber-700/20 text-amber-600 border-amber-700/30";
    return "bg-muted text-muted-foreground border-transparent";
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8 animate-in fade-in duration-500 overflow-x-hidden w-full">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">See how you stack up against the community.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Timeframes */}
          <div className="flex bg-muted p-1 rounded-xl w-full sm:w-auto">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`flex-1 sm:px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  timeframe === tf.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Metrics */}
          <div className="flex bg-muted p-1 rounded-xl w-full sm:w-auto">
            {METRICS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMetric(m.value)}
                className={`flex-1 sm:px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  metric === m.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          </div>
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>
      ) : records?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl shadow-card border border-border/50 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No data yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Not enough activity in this period. Be the first to start learning!
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Premium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {topThree.map((record, i) => {
               // Re-map index for visual display: #2, #1, #3 on desktop? Or just 1-2-3 left to right.
               // It's usually nice to put #1 in the middle if styling heavily, but left-to-right is perfectly clean.
               return (
                <motion.div
                  key={record.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative p-6 rounded-2xl border ${
                    record.user_id === user?.id 
                      ? "bg-primary/5 border-primary/30 shadow-primary/10 shadow-lg" 
                      : "bg-card border-border/50 shadow-card"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border ${getRankBadgeClass(record.rank)}`}>
                        {record.rank}
                      </div>
                      <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                        <AvatarImage src={record.avatar_url || ""} />
                        <AvatarFallback className="text-sm bg-primary/10 text-primary">
                          {(record.full_name || "??").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <Trophy className={`w-8 h-8 ${getMedalColor(record.rank)} drop-shadow-sm`} />
                  </div>

                  <h3 className="font-semibold text-base text-foreground truncate max-w-[200px]">
                    {record.full_name || "Anonymous User"}
                  </h3>
                  {record.user_id === user?.id && (
                    <span className="text-[10px] uppercase font-bold tracking-wider text-primary">You</span>
                  )}

                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        {metric === "time_spent" ? "Study Time" : "Completed"}
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {metric === "time_spent" ? formatTimeSpent(record.score) : record.score}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem className="gap-2 cursor-pointer transition-colors" onClick={() => handleShare(record)}>
                          <Share2 className="w-4 h-4" /> Copy Share Link
                        </DropdownMenuItem>
                        <Link to={`/share/${record.user_id}?timeframe=${timeframe}&metric=${metric}`} target="_blank">
                          <DropdownMenuItem className="gap-2 cursor-pointer transition-colors">
                            <ExternalLink className="w-4 h-4" /> Open Profile
                          </DropdownMenuItem>
                        </Link>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* List for the rest */}
          {restOfList.length > 0 && (
            <div className="bg-card shadow-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_100px_50px] gap-4 p-4 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="w-10 text-center">Rank</div>
                <div>Learner</div>
                <div className="text-right">{metric === "time_spent" ? "Time" : "Topics"}</div>
                <div></div>
              </div>

              <div className="divide-y divide-border/50">
                {restOfList.map((record, i) => (
                  <motion.div
                    key={record.user_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + (i * 0.05) }}
                    className={`grid grid-cols-[auto_1fr_100px_50px] gap-4 p-4 items-center transition-colors hover:bg-muted/30 ${
                      record.user_id === user?.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="w-10 text-center font-medium text-foreground">{record.rank}</div>
                    
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-8 h-8 shrink-0 border border-border/50">
                        <AvatarImage src={record.avatar_url || ""} />
                        <AvatarFallback className="text-[10px]">
                          {(record.full_name || "??").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                      <span className={`font-medium text-sm truncate block ${record.user_id === user?.id ? "text-primary font-bold" : "text-foreground"}`}>
                        {record.full_name || "Anonymous User"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono font-bold text-sm text-foreground">
                    {metric === "time_spent" ? formatTimeSpent(record.score) : record.score}
                  </div>

                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem className="gap-2 cursor-pointer transition-colors" onClick={() => handleShare(record)}>
                            <Share2 className="w-4 h-4" /> Copy Share Link
                          </DropdownMenuItem>
                          <Link to={`/share/${record.user_id}?timeframe=${timeframe}&metric=${metric}`} target="_blank">
                            <DropdownMenuItem className="gap-2 cursor-pointer transition-colors">
                              <ExternalLink className="w-4 h-4" /> Open Profile
                            </DropdownMenuItem>
                          </Link>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          
          {/* User's highlighted rank at the very bottom if they are > 3 and exist in list */}
          {currentRank && currentRank.rank > 3 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky bottom-20 lg:bottom-4 left-0 right-0 max-w-2xl mx-auto p-4 flex items-center justify-between bg-card/95 backdrop-blur-md shadow-elevated border-t-2 border-primary rounded-2xl z-40"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center border border-primary/30 text-sm">
                  #{currentRank.rank}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Your Rank</p>
                  <p className="text-xs text-muted-foreground">
                    {metric === "time_spent" ? formatTimeSpent(currentRank.score) : currentRank.score} {metric === "time_spent" ? "studied" : "completed"}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl gap-2 h-9" onClick={() => handleShare(currentRank)}>
                <Share2 className="w-3.5 h-3.5" /> Share
              </Button>
            </motion.div>
          )}

        </>
      )}
    </div>
  );
};

export default LeaderboardPage;
