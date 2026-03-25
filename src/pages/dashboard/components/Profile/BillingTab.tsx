import { useEffect } from "react";
import { useBilling } from "@/hooks/useBilling";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Rocket, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

export const BillingTab = () => {
  const { profile } = useAuth();
  const { 
    plans, fetchPlans, currentPlan, subscriptionEnd, invoices, paymentMethods, 
    fetchBillingDetails, handleCheckout, openCustomerPortal, checkoutLoading, loading 
  } = useBilling();

  useEffect(() => {
    fetchPlans();
    fetchBillingDetails();
  }, [fetchPlans, fetchBillingDetails]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading billing details...</p>
      </div>
    );
  }

  const isFree = currentPlan === "free";
  const daysLeft = subscriptionEnd ? differenceInDays(new Date(subscriptionEnd), new Date()) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-foreground">Billing & Plans</h3>
        <p className="text-sm text-muted-foreground">Manage your subscription, payment methods, and billing history.</p>
      </div>

      <div className="bg-gradient-to-br from-primary/10 via-background to-background rounded-2xl border border-primary/20 p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
        <div className="space-y-2 relative z-10">
          <Badge className="bg-primary hover:bg-primary text-primary-foreground font-semibold px-3 py-1 text-xs">
             Current Plan: {currentPlan.toUpperCase()}
          </Badge>
          <h4 className="text-2xl font-bold text-foreground">{isFree ? "Free Explorer" : "Pro Learner"}</h4>
          {subscriptionEnd && !isFree && (
            <p className="text-sm text-muted-foreground font-medium">
               Renews in {daysLeft} days <span className="text-muted-foreground/50 mx-1">•</span> {format(new Date(subscriptionEnd), "MMM d, yyyy")}
            </p>
          )}
        </div>
        <div className="relative z-10 w-full md:w-auto">
          {!isFree ? (
            <Button onClick={openCustomerPortal} className="w-full md:w-auto h-11 px-6 rounded-xl bg-background text-foreground border border-border shadow-sm hover:bg-muted/50 gap-2">
              <CreditCard className="w-4 h-4" /> Manage Subscription
            </Button>
          ) : (
            <Button onClick={() => {
              const proPlan = plans.find(p => p.slug === "pro" || p.slug === "paid");
              if (proPlan?.stripe_price_id) handleCheckout(proPlan.stripe_price_id);
            }} disabled={!!checkoutLoading} className="w-full md:w-auto h-11 px-6 rounded-xl gap-2 font-medium">
              {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />} Upgrade to Pro
            </Button>
          )}
        </div>
      </div>

      {invoices.length > 0 && (
        <div className="space-y-4 pt-6 mt-6 border-t border-border">
          <h4 className="text-base font-bold text-foreground">Recent Invoices</h4>
          <div className="space-y-3">
             {invoices.map((inv) => (
                <div key={inv.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{inv.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{inv.created ? format(new Date(inv.created), "MMMM d, yyyy") : "Unknown date"}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-3 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-sm font-bold text-foreground">${(inv.amount / 100).toFixed(2)} {inv.currency.toUpperCase()}</span>
                    {inv.invoice_url && (
                      <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
                         Download <ArrowRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};
