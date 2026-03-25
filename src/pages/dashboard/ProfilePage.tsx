import { useState, useEffect } from "react";
import { 
  User as UserIcon, Shield, CreditCard, Sparkles, LogOut, CheckCircle2, Settings, Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { profileApi } from "@/api/profile.api";
import { ProfileTab } from "./components/Profile/ProfileTab";
import { SecurityTab } from "./components/Profile/SecurityTab";
import { BillingTab } from "./components/Profile/BillingTab";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

type TabValue = "profile" | "security" | "billing";

const TABS = [
  { id: "profile", label: "General", icon: UserIcon },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Billing", icon: CreditCard },
];

const ProfilePage = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabValue>("profile");
  const [stats, setStats] = useState({ journeys: 0, topics: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([
        profileApi.getJourneyCount(user.id),
        profileApi.getTopicCount(user.id)
      ]).then(([journeys, topics]) => {
        setStats({ journeys, topics });
        setLoading(false);
      });
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const isPro = profile?.plan === "paid" || profile?.plan === "pro";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {/* Header section */}
        <div className="relative h-32 md:h-40 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-border">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(0,0,0,0.8),transparent)]" />
        </div>
        
        <div className="px-6 md:px-10 pb-8 -mt-16 md:-mt-20 relative z-10">
          <div className="flex flex-col md:flex-row gap-6 md:items-end md:justify-between">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-5">
              <div className="w-32 h-32 rounded-2xl border-4 border-card shadow-elevated bg-muted overflow-hidden shrink-0 bg-gradient-to-br from-primary/5 to-primary/20">
                 {profile?.avatar_url ? (
                   <img src={profile.avatar_url} alt={profile.full_name || "User"} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary">
                     {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "?"}
                   </div>
                 )}
              </div>
              <div className="text-center md:text-left mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {profile?.full_name || "Learner"}
                </h1>
                <p className="text-sm text-muted-foreground flex items-center justify-center md:justify-start gap-1.5 mt-1">
                  {user?.email}
                  {isPro && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 mr-1" /> Pro
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 md:mb-2 w-full md:w-auto">
               <div className="flex-1 md:flex-none bg-muted/50 rounded-xl px-4 py-2 border border-border flex flex-col items-center justify-center">
                 <span className="text-xl font-bold text-foreground">{stats.journeys}</span>
                 <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Journeys</span>
               </div>
               <div className="flex-1 md:flex-none bg-muted/50 rounded-xl px-4 py-2 border border-border flex flex-col items-center justify-center">
                 <span className="text-xl font-bold text-foreground">{stats.topics}</span>
                 <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Topics</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Nav */}
        <div className="col-span-1 border-r border-border/50 lg:pr-6 space-y-8 h-fit">
          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
             {TABS.map((tab) => {
               const Icon = tab.icon;
               const active = activeTab === tab.id;
               return (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as TabValue)}
                   className={cn(
                     "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 lg:w-full text-left relative",
                     active ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                   )}
                 >
                   {active && (
                     <motion.div layoutId="activeTab" className="absolute inset-0 bg-primary/10 rounded-xl z-0" initial={false} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                   )}
                   <Icon className={cn("w-4 h-4 z-10", active ? "text-primary" : "text-muted-foreground")} /> 
                   <span className="z-10">{tab.label}</span>
                 </button>
               );
             })}
          </nav>
          
          <div className="hidden lg:block pt-6 border-t border-border">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-3" onClick={handleLogout}>
               <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="col-span-1 lg:col-span-3">
          <div className="bg-card rounded-2xl border border-border shadow-card p-6 md:p-8 min-h-[500px]">
             <AnimatePresence mode="wait" initial={false}>
               <motion.div
                 key={activeTab}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.2 }}
               >
                 {activeTab === "profile" && <ProfileTab />}
                 {activeTab === "security" && <SecurityTab />}
                 {activeTab === "billing" && <BillingTab />}
               </motion.div>
             </AnimatePresence>
          </div>
          
          {/* Mobile Logout */}
          <div className="lg:hidden mt-8 flex justify-center">
            <Button variant="outline" className="text-muted-foreground hover:text-destructive w-full" onClick={handleLogout}>
               <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
