import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2, Crown, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const PLAN_DETAILS: Record<string, { icon: typeof Crown; label: string; features: string[]; price: string }> = {
  starter: {
    icon: Zap,
    label: "Starter",
    price: "$10/month",
    features: ["10 Learning Journeys", "700 Topics", "Advanced Analytics", "Points & Rewards", "File Uploads", "Priority Support"],
  },
  premium: {
    icon: Crown,
    label: "Premium",
    price: "$19/month",
    features: ["Unlimited Journeys", "Unlimited Topics", "Full Analytics Suite", "All Rewards", "Cloud Storage", "Dedicated Support"],
  },
};

const PaymentSuccessPage = () => {
  const { refreshProfile, profile } = useAuth();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(true);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    const syncSubscription = async () => {
      setSyncing(true);
      try {
        const { data } = await supabase.functions.invoke("check-subscription");
        if (data?.plan && data.plan !== "free") {
          setPlan(data.plan);
        }
        await refreshProfile();
      } catch (_) {}
      setSyncing(false);
    };
    syncSubscription();
  }, []);

  const details = plan ? PLAN_DETAILS[plan] : null;
  const PlanIcon = details?.icon || Crown;

  if (syncing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Confirming your payment...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6"
      >
        <Check className="w-8 h-8 text-green-500" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center max-w-md"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">Payment Successful! 🎉</h1>
        <p className="text-muted-foreground mb-6">
          Thank you for upgrading! Your new plan is now active.
        </p>

        {details && (
          <div className="p-6 rounded-2xl bg-card border border-primary/20 shadow-card mb-6 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <PlanIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{details.label} Plan</h3>
                <p className="text-sm text-primary font-bold">{details.price}</p>
              </div>
            </div>
            <div className="space-y-2">
              {details.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Your subscription will automatically renew monthly. You'll receive reminders before each renewal.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("/app")} className="rounded-xl gap-2">
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate("/app/profile?tab=billing")} className="rounded-xl">
            View Billing
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentSuccessPage;
