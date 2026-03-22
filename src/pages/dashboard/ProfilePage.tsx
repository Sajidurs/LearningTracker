import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Loader2, CreditCard, Receipt, Shield, Check, ArrowUpRight, HelpCircle, AlertTriangle, BookOpen, FolderOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";

// Plans are now fetched dynamically from the database using fetchPlans()
// The component below is refactored to use data from the 'plans' table.


interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  invoice_url: string | null;
  description: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface PlanInfo {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  interval: string;
  max_journeys: number;
  max_topics: number;
  features: string[];
  stripe_price_id: string | null;
}

const TAB_LIST = [
  { key: "profile", label: "Profile" },
  { key: "security", label: "Security" },
  { key: "billing", label: "Billing" },
];

const ProfilePage = () => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultTab = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(defaultTab);

  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Billing
  const [billingLoading, setBillingLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  // Initialize from profile.plan (already Stripe-synced by AuthContext) so all tabs show correct plan immediately
  const [currentPlan, setCurrentPlan] = useState<string>(profile?.plan || "free");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Manage Plan Modal
  const [managePlanOpen, setManagePlanOpen] = useState(false);
  const [allPlans, setAllPlans] = useState<PlanInfo[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);

  // Deactivation
  const [deactivating, setDeactivating] = useState(false);

  // Usage stats
  const [journeyCount, setJourneyCount] = useState(0);
  const [topicCount, setTopicCount] = useState(0);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      // Always sync from profile (which is updated from Stripe by AuthContext)
      setCurrentPlan(profile.plan || "free");
    }
  }, [profile]);

  // Fetch usage counts
  useEffect(() => {
    if (!user) return;
    const fetchUsage = async () => {
      const [{ count: jCount }, { count: tCount }] = await Promise.all([
        supabase.from("learning_journeys").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("topics").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setJourneyCount(jCount || 0);
      setTopicCount(tCount || 0);
    };
    fetchUsage();
  }, [user]);

  useEffect(() => {
    if (activeTab === "billing") fetchBilling();
  }, [activeTab]);

  const fetchBilling = async () => {
    setBillingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      if (data) {
        setCurrentPlan(data.plan || "free");
        setSubscriptionEnd(data.subscription_end || null);
        setInvoices(data.invoices || []);
        setPaymentMethods(data.payment_methods || []);
      }
    } catch (e: any) {
      console.error("Billing fetch error:", e);
    }
    setBillingLoading(false);
  };

  const fetchPlans = async () => {
    setPlansLoading(true);
    const { data } = await supabase.from("plans").select("*").eq("is_active", true).order("sort_order");
    if (data) setAllPlans(data as any);
    setPlansLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ full_name: fullName } as any).eq("user_id", user.id);
    await refreshProfile();
    setSaving(false);
    toast({ title: "Profile saved!" });
  };

  const handlePasswordChange = async () => {
    if (!newPassword) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Password update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated!" });
      
      // Trigger Password Update Email
      try {
        await supabase.functions.invoke("send-email", {
          body: { 
            to: user?.email, 
            type: "password_update" 
          }
        });
      } catch (e) {
        console.error("Failed to send password update email:", e);
      }

      setNewPassword("");
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;

      // Try to remove old file first (ignore errors)
      try {
        const { data: existingFiles } = await supabase.storage.from("avatars").list(user.id);
        if (existingFiles && existingFiles.length > 0) {
          const oldPaths = existingFiles.map(f => `${user.id}/${f.name}`);
          await supabase.storage.from("avatars").remove(oldPaths);
        }
      } catch (_) { }

      const { error } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        setAvatarUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: avatarUrl } as any).eq("user_id", user.id);
      await refreshProfile();
      toast({ title: "Avatar updated!" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
    setAvatarUploading(false);
  };

  const handleDeactivateAccount = async () => {
    setDeactivating(true);
    try {
      const { error } = await supabase.functions.invoke("deactivate-account");
      if (error) throw error;
      await signOut();
      navigate("/");
      toast({ title: "Account deactivated", description: "Your account and all data have been permanently deleted." });
    } catch (e: any) {
      toast({ title: "Deactivation failed", description: e.message, variant: "destructive" });
    }
    setDeactivating(false);
  };

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Checkout failed", description: e.message, variant: "destructive" });
    }
    setCheckoutLoading(null);
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Could not open portal", description: e.message, variant: "destructive" });
    }
  };

  const openManagePlan = () => {
    fetchPlans();
    setManagePlanOpen(true);
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const planLabel = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Account Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, security, and billing preferences.</p>
      </div>

      {/* Custom Tabs */}
      <div className="flex gap-6 border-b border-border">
        {TAB_LIST.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === tab.key
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content Area - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-card space-y-6">
              {/* Profile Photo + Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Profile Photo</h3>
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-primary-foreground">
                            {initials}
                          </div>
                        )}
                      </div>
                      <div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sm font-semibold text-primary hover:underline"
                          disabled={avatarUploading}
                        >
                          {avatarUploading ? "Uploading..." : "Change Photo"}
                        </button>
                        <p className="text-xs text-muted-foreground">JPG, GIF or PNG. 1MB max.</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAvatarUpload(file);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Full Name</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Email Address</label>
                    <Input value={user?.email || ""} disabled className="opacity-60" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <Button variant="outline" className="rounded-xl" onClick={() => {
                  setFullName(profile?.full_name || "");
                }}>
                  Cancel
                </Button>
                <Button className="rounded-xl gap-2" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === "security" && (
            <div className="bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-card space-y-5">
              <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
              <div className="max-w-sm space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">New Password</label>
                  <Input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <Button className="rounded-xl gap-2" onClick={handlePasswordChange} disabled={saving || !newPassword}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Update Password
                </Button>
              </div>
            </div>
          )}

          {/* BILLING TAB */}
          {activeTab === "billing" && (
            <div className="space-y-5">
              {/* Current Plan */}
              <div className="bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-card">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Shield className="w-4 h-4" /> Current Plan</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-background border border-border">
                  <div>
                    <p className="font-semibold text-foreground">{planLabel} Plan</p>
                    <p className="text-xs text-muted-foreground">
                      {currentPlan === "free" ? "2 learning journeys, Regular access" : "Unlimited learning journeys & All features"}
                    </p>
                    {subscriptionEnd && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Renews {new Date(subscriptionEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={openManagePlan}>
                    Manage
                  </Button>
                </div>

                {currentPlan === "free" && !billingLoading && (
                  <div className="grid grid-cols-1 gap-4 mt-4 max-w-sm">
                    {allPlans.filter(p => p.slug === "paid").map((plan) => (
                      <div key={plan.id} className="p-5 rounded-2xl border-2 border-primary/20 bg-primary/5 hover:border-primary transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-lg text-foreground">{plan.name}</p>
                            <p className="text-2xl font-black text-primary">${(plan.price / 100).toFixed(0)}<span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span></p>
                          </div>
                          <Badge className="bg-primary/20 text-primary border-0">Best Value</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Unlock all features including unlimited journeys and AI tools.</p>
                        <Button className="w-full rounded-xl" onClick={() => plan.stripe_price_id && handleCheckout(plan.stripe_price_id)}
                          disabled={checkoutLoading === plan.stripe_price_id}>
                          {checkoutLoading === plan.stripe_price_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Upgrade to Paid"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-card">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment Methods</h3>
                {billingLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : paymentMethods.length > 0 ? (
                  <div className="space-y-2">
                    {paymentMethods.map((pm) => (
                      <div key={pm.id} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                        <CreditCard className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground capitalize">{pm.brand} •••• {pm.last4}</p>
                          <p className="text-xs text-muted-foreground">Expires {pm.exp_month}/{pm.exp_year}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No payment methods on file.</p>
                )}
                {currentPlan !== "free" && (
                  <Button size="sm" variant="outline" className="mt-3 rounded-xl" onClick={handleManageSubscription}>
                    Manage Payment Methods
                  </Button>
                )}
              </div>

              {/* Payment History */}
              <div className="bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-card">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Receipt className="w-4 h-4" /> Payment History</h3>
                {billingLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : invoices.length > 0 ? (
                  <div className="space-y-2">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border flex-wrap sm:flex-nowrap">
                        <Receipt className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{inv.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(inv.created).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            ${(inv.amount / 100).toFixed(2)} {inv.currency.toUpperCase()}
                          </p>
                          <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="text-[10px]">
                            {inv.status}
                          </Badge>
                        </div>
                        {inv.invoice_url && (
                          <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline shrink-0">View</a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No payment history yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Deactivate Account - always visible at bottom */}
          <div className="bg-card rounded-2xl border border-destructive/30 p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-destructive">Deactivate Account</h3>
              <p className="text-xs text-muted-foreground">This will permanently delete your data and cancel your subscription.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10 shrink-0">
                  Deactivate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account, all learning journeys, topics, progress data, and cancel any active subscription.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeactivateAccount}
                    disabled={deactivating}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deactivating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Yes, delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Sidebar - Right col */}
        <div className="space-y-5">
          {/* Active Plan Card */}
          <div className="bg-primary rounded-2xl p-5 text-primary-foreground shadow-elevated">
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-[10px] uppercase tracking-wider mb-3">
              Active Plan
            </Badge>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold">{planLabel} Plan</h3>
                {subscriptionEnd && (
                  <p className="text-sm text-primary-foreground/80">
                    Renews on {new Date(subscriptionEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
              <Check className="w-5 h-5 text-primary-foreground/60" />
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs font-medium text-primary-foreground/80 uppercase tracking-wider">Monthly Usage</p>

              {/* Learnings usage */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1 text-primary-foreground/80"><BookOpen className="w-3 h-3" /> Learnings</span>
                  <span className="font-semibold">
                    {journeyCount} / {currentPlan === "free" ? "2" : "∞"}
                  </span>
                </div>
                <Progress
                  value={currentPlan === "free" ? Math.min((journeyCount / 2) * 100, 100) : 0}
                  className="h-2 bg-primary-foreground/20"
                />
              </div>

              {/* Topics usage */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1 text-primary-foreground/80"><FolderOpen className="w-3 h-3" /> Topics</span>
                  <span className="font-semibold">
                    {topicCount} / {currentPlan === "free" ? "100" : "∞"}
                  </span>
                </div>
                <Progress
                  value={currentPlan === "free" ? Math.min((topicCount / 100) * 100, 100) : 0}
                  className="h-2 bg-primary-foreground/20"
                />
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4 rounded-xl border-primary-foreground/30 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20"
              onClick={() => { setActiveTab("billing"); fetchBilling(); }}
            >
              Manage Billing
            </Button>
          </div>

          {/* Need Help Card */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-card">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-foreground">Need help?</h4>
                <p className="text-xs text-muted-foreground mt-1">Check our knowledge base or reach out to our support team for assistance with your account.</p>
                <button onClick={() => navigate("/app/support")} className="text-xs font-semibold text-foreground underline underline-offset-2 mt-2 inline-block">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manage Plan Modal */}
      <Dialog open={managePlanOpen} onOpenChange={setManagePlanOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Your Plan</DialogTitle>
            <DialogDescription>You are currently on the <span className="font-semibold text-foreground">{planLabel}</span> plan.</DialogDescription>
          </DialogHeader>

          {plansLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-3 mt-2">
              {allPlans.map((plan) => {
                const isCurrent = plan.slug === currentPlan;
                const isDowngrade = plan.price < (allPlans.find(p => p.slug === currentPlan)?.price || 0);
                const isUpgrade = plan.price > (allPlans.find(p => p.slug === currentPlan)?.price || 0);
                return (
                  <div key={plan.id} className={`p-4 rounded-xl border-2 transition-colors ${isCurrent ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{plan.name}</h4>
                          {isCurrent && <Badge className="bg-primary text-primary-foreground text-[10px]">Current Plan</Badge>}
                        </div>
                        <p className="text-xl font-bold text-foreground mt-1">
                          {plan.price === 0 ? "Free" : `$${(plan.price / 100).toFixed(0)}`}
                          {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {plan.max_journeys === -1 ? "Unlimited" : plan.max_journeys} Journeys · {plan.max_topics === -1 ? "Unlimited" : plan.max_topics} Topics
                        </p>
                        {plan.features.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {plan.features.map((f, i) => (
                              <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Check className="w-3 h-3 text-primary shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="shrink-0">
                        {isCurrent ? (
                          currentPlan !== "free" ? (
                            <Button size="sm" variant="outline" className="rounded-full text-xs gap-1" onClick={handleManageSubscription}>
                              <ArrowUpRight className="w-3 h-3" /> Portal
                            </Button>
                          ) : null
                        ) : isDowngrade && plan.slug === "free" && currentPlan !== "free" ? (
                          // Downgrade to free = cancel via portal (at period end)
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-xs"
                            onClick={() => {
                              handleManageSubscription();
                              setManagePlanOpen(false);
                            }}
                          >
                            Downgrade
                          </Button>
                        ) : isDowngrade && plan.slug !== "free" ? (
                          // Downgrade from premium to starter = schedule via portal at period end
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-xs"
                            onClick={() => {
                              handleManageSubscription();
                              setManagePlanOpen(false);
                            }}
                          >
                            Downgrade
                          </Button>
                        ) : (
                          // Upgrade
                          <Button
                            size="sm"
                            variant="default"
                            className="rounded-full text-xs"
                            onClick={() => {
                              if (plan.stripe_price_id) {
                                handleCheckout(plan.stripe_price_id);
                                setManagePlanOpen(false);
                              }
                            }}
                            disabled={checkoutLoading === plan.stripe_price_id}
                          >
                            {checkoutLoading === plan.stripe_price_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : "Upgrade"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {subscriptionEnd && currentPlan !== "free" && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Your subscription renews on {new Date(subscriptionEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                  <div className="p-3 rounded-xl bg-muted/50 border border-border">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">Downgrade policy:</span> If you downgrade, your current plan stays active until the billing period ends. You'll only be charged for the new plan after that.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
