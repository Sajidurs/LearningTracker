import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

const PublicSharePage = () => {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  
  const timeframe = searchParams.get("timeframe") || "monthly";
  const metric = searchParams.get("metric") || "time_spent";

  const { data: record, isLoading } = useQuery<any | null>({
    queryKey: ["public_leaderboard", userId, timeframe, metric],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase.rpc("get_leaderboard", {
        timeframe,
        metric,
      });
      if (error) {
        console.error(error);
        return null;
      }
      const allRanks = data as unknown as any[];
      return allRanks.find(r => r.user_id === userId) || null;
    },
    enabled: !!userId,
  });
  
  // Total members query for context
  const { data: totalCount } = useQuery({
    queryKey: ["total_leaderboard_members"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("show_on_leaderboard", true);
      return count || 0;
    }
  });

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return "bg-yellow-400/20 text-yellow-500 border-yellow-400/30";
    if (rank === 2) return "bg-slate-300/20 text-slate-300 border-slate-300/30";
    if (rank === 3) return "bg-amber-700/20 text-amber-600 border-amber-700/30";
    return "bg-primary/20 text-primary border-primary/30";
  };

  const timeframeLabels: Record<string, string> = {
    daily: "24h",
    weekly: "7 Day",
    monthly: "30 Day",
    yearly: "Seasonal",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background/50">
        <Skeleton className="w-[350px] h-[400px] rounded-3xl" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Rank Not Found</h2>
        <p className="text-muted-foreground mt-2 text-center max-w-sm mb-6">
          This user might not be in the top 100, or they have chosen to hide their profile from the leaderboard.
        </p>
        <Link to="/">
          <Button variant="outline" className="rounded-xl">Go to Homepage</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4 overflow-x-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="w-full max-w-md">
        <div className="bg-card shadow-elevated border border-border/50 rounded-3xl overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="p-8 text-center flex flex-col items-center relative">
            
            {/* Context Badge */}
            <div className="absolute top-4 right-4 bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
              {timeframeLabels[timeframe]} • {metric === "time_spent" ? "Study Time" : "Topics"}
            </div>

            <Avatar className="w-24 h-24 mb-6 mt-4 shadow-xl border-4 border-background ring-2 ring-primary/20">
              <AvatarImage src={record.avatar_url || ""} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                {(record.full_name || "??").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <h1 className="text-2xl font-bold text-foreground truncate w-full px-4">
              {record.full_name || "Anonymous Learner"}
            </h1>
            
            <p className="text-sm text-muted-foreground mt-1 mb-8">
              is ranking among top members
            </p>

            <div className="w-full grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-2xl flex flex-col items-center justify-center border border-border/30">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Rank</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">#{record.rank}</span>
                  {totalCount > 0 && <span className="text-xs text-muted-foreground">/ {totalCount}</span>}
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-2xl flex flex-col items-center justify-center border border-border/30">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  {metric === "time_spent" ? "Time" : "Topics"}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary">
                    {metric === "time_spent" 
                      ? `${Math.floor(record.score / 3600)}h ${Math.floor((record.score % 3600) / 60)}m` 
                      : record.score}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 w-full">
              <Link to="/" className="w-full">
                <Button className="w-full rounded-xl h-12 text-md font-semibold gap-2 shadow-primary/20 shadow-lg group">
                  <Trophy className="w-4 h-4 group-hover:scale-110 transition-transform" /> Join the Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicSharePage;
