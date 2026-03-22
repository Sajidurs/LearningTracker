import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Mail, Lock, User, Loader2, Check, ChevronDown, CreditCard, CalendarDays, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
// import { lovable } from "@/integrations/lovable/index";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  interval: string;
  features: string[];
  stripe_price_id: string | null;
  max_journeys: number;
  max_topics: number;
}

const SignupPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>("free");
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const planFromUrl = searchParams.get("plan");
    if (planFromUrl) setSelectedPlanSlug(planFromUrl);
  }, [searchParams]);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from("plans")
        .select("id, name, slug, price, interval, features, stripe_price_id, max_journeys, max_topics")
        .eq("is_active", true)
        .order("sort_order");
      if (data) {
        setPlans(data.map(p => ({
          ...p,
          features: Array.isArray(p.features) ? (p.features as string[]) : [],
        })));
      }
    };
    fetchPlans();
  }, []);

  const selectedPlan = plans.find(p => p.slug === selectedPlanSlug) || null;
  const isPaid = selectedPlan && selectedPlan.price > 0;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are identical.", variant: "destructive" });
      return;
    }
    if (!agreedToTerms) {
      toast({ title: "Terms required", description: "Please agree to the Terms of Service.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, name);

    if (error) {
      setLoading(false);
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      return;
    }

    // If user selected a paid plan, store price ID and redirect to dashboard
    // The dashboard startup hook will trigger checkout once session is ready
    if (isPaid && selectedPlan?.stripe_price_id) {
      sessionStorage.setItem("pending_checkout_price_id", selectedPlan.stripe_price_id);
    }

    toast({ title: "Account created!", description: "Welcome to Track and Grow" });
    
    // Trigger Welcome Email
    try {
      await supabase.functions.invoke("send-email", {
        body: { 
          to: email, 
          type: "welcome" 
        }
      });
    } catch (e) {
      console.error("Failed to send welcome email:", e);
    }

    navigate("/app");
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      toast({ title: "Google signup failed", description: String(error), variant: "destructive" });
    }
    setGoogleLoading(false);
  };

  const formatPrice = (price: number) => `$${(price / 100).toFixed(0)}`;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-16">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-primary-foreground">Track and Grow</span>
          </Link>

          <div className="space-y-4 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-foreground/15 text-primary-foreground text-xs font-medium backdrop-blur-sm">
              <Sparkles className="w-3 h-3" /> Join 10,000+ lifelong learners
            </span>
            <h2 className="text-4xl font-bold text-primary-foreground leading-tight">
              Track your growth,<br />one step at a time.
            </h2>
            <p className="text-primary-foreground/70 text-base leading-relaxed max-w-sm">
              Visualize your learning journey with interactive progress tracking, goal setting, and achievement badges.
            </p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="relative z-10">
          <div className="rounded-2xl bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/10 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-primary-foreground">Secure & Private</span>
            </div>
            <p className="text-xs text-primary-foreground/60">Your data is encrypted and never shared. Cancel anytime with no questions asked.</p>
          </div>
        </div>

        {/* Background circles */}
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-primary-foreground/5" />
        <div className="absolute top-20 -right-16 w-48 h-48 rounded-full bg-primary-foreground/5" />
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[480px] space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-4">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">Track and Grow</span>
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">Start your learning journey today.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 text-foreground text-sm placeholder:text-muted-foreground/60 outline-none border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 text-foreground text-sm placeholder:text-muted-foreground/60 outline-none border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" />
              </div>
            </div>

            {/* Password row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 text-foreground text-sm placeholder:text-muted-foreground/60 outline-none border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Confirm</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 text-foreground text-sm placeholder:text-muted-foreground/60 outline-none border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" />
                </div>
              </div>
            </div>

            {/* Plan Selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Select Plan</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPlanDropdownOpen(!planDropdownOpen)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-secondary/50 text-sm outline-none border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all text-left",
                    selectedPlan ? "text-foreground" : "text-muted-foreground/60"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    {selectedPlan ? (
                      <span>{selectedPlan.name} — {selectedPlan.price === 0 ? "Free forever" : `${formatPrice(selectedPlan.price)}/${selectedPlan.interval}`}</span>
                    ) : "Choose a plan"}
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", planDropdownOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {planDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-20 w-full mt-1.5 rounded-xl border border-border bg-card shadow-elevated overflow-hidden"
                    >
                      {plans.map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => { setSelectedPlanSlug(plan.slug); setPlanDropdownOpen(false); }}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/60 transition-colors text-left",
                            selectedPlanSlug === plan.slug && "bg-primary/5"
                          )}
                        >
                          <div>
                            <span className="font-medium text-foreground">{plan.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {plan.price === 0 ? "Free forever" : `${formatPrice(plan.price)}/${plan.interval}`}
                            </span>
                          </div>
                          {selectedPlanSlug === plan.slug && <Check className="w-4 h-4 text-primary" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Order Summary - only for paid plans */}
            <AnimatePresence>
              {isPaid && selectedPlan && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Summary</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground">{selectedPlan.name} Plan</span>
                        <span className="font-semibold text-foreground">{formatPrice(selectedPlan.price)}/{selectedPlan.interval}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5" /> Billing cycle
                        </span>
                        <span className="text-foreground">Monthly</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Journeys included</span>
                        <span className="text-foreground">{selectedPlan.max_journeys === -1 ? "Unlimited" : selectedPlan.max_journeys}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Topics included</span>
                        <span className="text-foreground">{selectedPlan.max_topics === -1 ? "Unlimited" : selectedPlan.max_topics}</span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between text-sm">
                        <span className="font-semibold text-foreground">Total today</span>
                        <span className="font-bold text-primary">{formatPrice(selectedPlan.price)}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">You'll be redirected to secure checkout after creating your account. Cancel anytime.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Terms */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 rounded border-border accent-primary"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I agree to the <span className="text-foreground font-medium underline">Terms of Service</span> and <span className="text-foreground font-medium underline">Privacy Policy</span>.
              </span>
            </label>

            {/* Submit */}
            <Button
              className="w-full h-11 rounded-xl font-medium"
              type="submit"
              disabled={loading || !agreedToTerms}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isPaid ? `Create Account & Continue to Payment` : "Create Account"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">or sign up with</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border bg-secondary/50 hover:bg-secondary transition-colors text-sm font-medium text-foreground disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Google
          </button>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-foreground font-semibold hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
