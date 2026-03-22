import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const plans = [
  {
    id: "paid" as const,
    name: "Paid",
    price: "$9",
    period: "/month",
    icon: Zap,
    priceId: "price_1TDlc8LWb8zGV3qkquBEK2vY",
    features: [
      "Unlimited Learning Journeys",
      "Unlimited Topics",
      "Advanced Analytics",
      "Points & Rewards",
      "AI Outline Generation",
      "Priority Support"
    ],
  },
];

const UpgradeModal = ({ open, onOpenChange }: UpgradeModalProps) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (priceId: string) => {
    setLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
        onOpenChange(false);
      }
    } catch (e: any) {
      toast({ title: "Checkout failed", description: e.message, variant: "destructive" });
    }
    setLoading(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Upgrade Your Plan</DialogTitle>
          <p className="text-sm text-muted-foreground">Unlock more learning journeys and features</p>
        </DialogHeader>
        <div className="grid gap-4 mt-2">
          {plans.map((plan) => (
            <div key={plan.id} className="p-5 rounded-2xl border border-border hover:border-primary transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <plan.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    <p className="text-2xl font-bold text-foreground">{plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period}</span></p>
                  </div>
                </div>
                <Button onClick={() => handleSelectPlan(plan.priceId)} disabled={loading === plan.priceId}>
                  {loading === plan.priceId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upgrade"}
                </Button>
              </div>
              <ul className="grid grid-cols-2 gap-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
