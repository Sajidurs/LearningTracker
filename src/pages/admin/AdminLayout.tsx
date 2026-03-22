import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, CreditCard, Settings, LogOut, Shield, Menu, X, MessageSquare, Package, HelpCircle,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { to: "/super-admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/super-admin/users", icon: Users, label: "Users", end: false },
  { to: "/super-admin/plans", icon: Package, label: "Plans", end: false },
  { to: "/super-admin/payments", icon: CreditCard, label: "Payments", end: false },
  { to: "/super-admin/feedback", icon: MessageSquare, label: "Feedback", end: false },
  { to: "/super-admin/support", icon: HelpCircle, label: "Support", end: false },
  { to: "/super-admin/settings", icon: Settings, label: "Settings", end: false },
];

const AdminLayout = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/super-admin-login"); return; }

    supabase.functions.invoke("admin-api", { body: { action: "get_stats" } })
      .then(({ data, error }) => {
        if (error || data?.error) { navigate("/super-admin-login"); return; }
        setIsAdmin(true);
      });
  }, [user, loading]);

  if (loading || isAdmin === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    navigate("/super-admin-login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar rounded-2xl shadow-sidebar overflow-hidden">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-sidebar-accent-foreground tracking-tight">Admin</span>
      </div>

      <nav className="flex-1 px-3 pt-2 space-y-0.5">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            onClick={() => isMobile && setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-colors">
          <LogOut className="w-5 h-5 opacity-60" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col shrink-0 p-3">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-72 p-3 flex flex-col h-full"><SidebarContent /></div>
          <div className="flex-1 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-3 shrink-0">
          <button className="md:hidden p-2 rounded-xl hover:bg-muted" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-sm font-semibold text-foreground">Super Admin Panel</h2>
          <span className="ml-auto text-xs text-muted-foreground">{user?.email}</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
