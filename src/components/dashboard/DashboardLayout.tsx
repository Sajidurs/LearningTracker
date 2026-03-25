import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, ListChecks, BarChart3, Gift, LogOut,
  Search, Bell, ChevronRight, Settings, Clock, CreditCard, Zap, ArrowUp, Menu, X, Calendar,
  FileText, User, Award, HelpCircle, Plus, Home, Trophy,
} from "lucide-react";
import CreateJourneyWizard from "@/components/dashboard/CreateJourneyWizard";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/dashboard/ThemeToggle";
import UpgradeModal from "@/components/dashboard/UpgradeModal";
import FeedbackWidget from "@/components/dashboard/FeedbackWidget";
import NotificationBell from "@/components/dashboard/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const mainMenu = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/app/learning", icon: BookOpen, label: "Learning Journeys", end: false },
  { to: "/app/notes", icon: FileText, label: "Notes", end: false },
  { to: "/app/calendar", icon: Calendar, label: "Calendar", end: false },
  { to: "/app/rewards", icon: Gift, label: "Rewards", end: false },
  { to: "/app/leaderboard", icon: Trophy, label: "Leaderboard", end: false },
];

const accountMenu = [
  { to: "/app/profile", icon: Settings, label: "My Profile", end: false },
  { to: "/app/support", icon: HelpCircle, label: "Support & Help", end: false },
];

const SEARCHABLE_PAGES = [
  { path: "/app", label: "Dashboard", icon: LayoutDashboard, keywords: ["dashboard", "home", "overview", "performance", "analytics"] },
  { path: "/app/learning", label: "Learning Journeys", icon: BookOpen, keywords: ["learning", "journey", "course", "study"] },
  { path: "/app/notes", label: "Notes", icon: FileText, keywords: ["notes", "write", "draft", "document"] },
  { path: "/app/calendar", label: "Calendar", icon: Calendar, keywords: ["calendar", "schedule", "date", "plan"] },
  { path: "/app/rewards", label: "Rewards", icon: Award, keywords: ["rewards", "points", "redeem", "gift"] },
  { path: "/app/profile", label: "My Profile", icon: User, keywords: ["profile", "settings", "account", "avatar", "billing"] },
  { path: "/app/support", label: "Support & Help", icon: HelpCircle, keywords: ["support", "help", "faq", "guide", "contact"] },
  { path: "/app/leaderboard", label: "Leaderboard", icon: Trophy, keywords: ["leaderboard", "rank", "top", "score"] },
];

const DashboardLayout = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const isMobile = useIsMobile();

  // Handle post-signup paid plan checkout redirect
  useEffect(() => {
    if (!user) return;
    const pendingPriceId = sessionStorage.getItem("pending_checkout_price_id");
    if (!pendingPriceId) return;
    sessionStorage.removeItem("pending_checkout_price_id");

    const triggerCheckout = async () => {
      try {
        // Small delay to ensure auth session is fully established
        await new Promise(r => setTimeout(r, 1500));
        const { data } = await supabase.functions.invoke("create-checkout", {
          body: { priceId: pendingPriceId },
        });
        if (data?.url) window.location.href = data.url;
        else if (data?.error) toast({ title: "Checkout failed", description: data.error, variant: "destructive" });
      } catch (err: any) {
        console.error("Post-signup checkout failed:", err);
      }
    };
    triggerCheckout();
  }, [user]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return SEARCHABLE_PAGES.filter(
      (p) => p.label.toLowerCase().includes(q) || p.keywords.some((k) => k.includes(q))
    );
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close search on navigation
  useEffect(() => {
    setSearchQuery("");
    setSearchFocused(false);
  }, [location.pathname]);

  const handleSearchNavigate = (path: string) => {
    navigate(path);
    setSearchQuery("");
    setSearchFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchResults.length > 0) {
      handleSearchNavigate(searchResults[0].path);
    }
    if (e.key === "Escape") {
      setSearchFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const planLabel = profile?.plan ? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1) + " Plan" : "Free Plan";
  const isPro = profile?.plan === "paid";

  const SidebarContent = () => (
    <div className="flex flex-col flex-1 bg-sidebar rounded-2xl shadow-sidebar overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-sidebar-accent-foreground tracking-tight">Track and Grow</span>
      </div>

      {/* Main Menu */}
      <nav className="flex-1 px-3 pt-2">
        <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-muted">Main Menu</p>
        <div className="space-y-0.5">
          {mainMenu.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              onClick={() => isMobile && setSidebarOpen(false)}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group overflow-hidden whitespace-nowrap ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? "text-primary" : "opacity-60 group-hover:opacity-100"}`} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && (
                    <>
                      <ChevronRight className="w-4 h-4 text-primary" />
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l-full bg-primary" />
                    </>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <p className="px-3 mt-6 mb-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-muted">Account</p>
        <div className="space-y-0.5">
          {accountMenu.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              onClick={() => isMobile && setSidebarOpen(false)}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group overflow-hidden whitespace-nowrap ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? "text-primary" : "opacity-60 group-hover:opacity-100"}`} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && (
                    <>
                      <ChevronRight className="w-4 h-4 text-primary" />
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l-full bg-primary" />
                    </>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Points Balance */}
      <div className="px-3 pb-2">
        <div className="p-4 rounded-2xl bg-primary/15 border border-primary/20">
          <p className="text-base font-bold text-primary">{profile?.total_points?.toLocaleString() || 0} Pts</p>
          <p className="text-xs text-sidebar-muted mt-0.5">Current points balance</p>
        </div>
      </div>

      {/* Upgrade Button (only for free users) */}
      {!isPro && (
        <div className="px-3 pb-2">
          <button
            onClick={() => { setUpgradeOpen(true); isMobile && setSidebarOpen(false); }}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
            Upgrade Now
          </button>
        </div>
      )}

      {/* Logout */}
      <div className="px-3 pb-5">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-colors">
          <LogOut className="w-5 h-5 opacity-60" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-sidebar overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col shrink-0 p-3">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-72 p-3 flex flex-col h-full bg-sidebar">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background rounded-tl-2xl">
        <header className="h-14 md:h-16 bg-background flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5 text-foreground" />
            </button>

            {/* Search */}
            <div ref={searchRef} className="hidden sm:block relative">
              <div className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2 w-64 md:w-72 transition-all duration-200 ${searchFocused
                ? "bg-card border border-primary/30 shadow-sm ring-1 ring-primary/10"
                : "bg-transparent border border-border/40 hover:bg-muted/40 hover:border-border/60"
                }`}>
                <Search className={`w-4 h-4 shrink-0 transition-colors ${searchFocused ? "text-primary" : "text-muted-foreground"}`} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={handleKeyDown}
                  className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search results dropdown */}
              <AnimatePresence>
                {searchFocused && searchQuery.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-elevated overflow-hidden z-50"
                  >
                    {searchResults.length > 0 ? (
                      searchResults.map((page) => (
                        <button
                          key={page.path}
                          onClick={() => handleSearchNavigate(page.path)}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                        >
                          <page.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{page.label}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-muted-foreground">No pages found</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile Points Wallet */}
            {isMobile && (
              <NavLink to="/app/rewards" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Award className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary">{profile?.total_points?.toLocaleString() || 0}</span>
              </NavLink>
            )}
            <ThemeToggle />
            <NotificationBell />
            <div className="w-px h-6 bg-border mx-1 hidden md:block" />
            <NavLink to="/app/profile" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-card overflow-hidden flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0 ring-2 ring-border">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-foreground leading-tight">{displayName}</p>
                <p className="text-[11px] font-medium text-primary uppercase tracking-wide">{planLabel}</p>
              </div>
            </NavLink>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${isMobile ? 'pb-24' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/50 px-2 pt-1.5 pb-[env(safe-area-inset-bottom,8px)]">
          <div className="flex items-end justify-around max-w-md mx-auto">
            {[
              { to: "/app", icon: Home, label: "Home", end: true },
              { to: "/app/rewards", icon: Gift, label: "Rewards", end: false },
            ].map((item) => {
              const isActive = item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[56px]"
                >
                  <item.icon
                    className={`w-[22px] h-[22px] transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    strokeWidth={isActive ? 2.2 : 1.6}
                  />
                  <span
                    className={`text-[10px] font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                  >
                    {item.label}
                  </span>
                </NavLink>
              );
            })}

            {/* Center Create Button */}
            <button
              onClick={() => navigate("/app/learning/create")}
              className="flex flex-col items-center -mt-5"
            >
              <div className="w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center ring-4 ring-background transition-transform active:scale-95">
                <Plus className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-medium text-primary mt-0.5">Create</span>
            </button>

            {[
              { to: "/app/calendar", icon: Calendar, label: "Calendar", end: false },
              { to: "/app/notes", icon: FileText, label: "Notes", end: false },
            ].map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[56px]"
                >
                  <item.icon
                    className={`w-[22px] h-[22px] transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    strokeWidth={isActive ? 2.2 : 1.6}
                  />
                  <span
                    className={`text-[10px] font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                  >
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <FeedbackWidget />
      <CreateJourneyWizard open={createOpen} onOpenChange={setCreateOpen} onCreated={() => { }} />
    </div>
  );
};

export default DashboardLayout;
