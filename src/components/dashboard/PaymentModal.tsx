import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: "paid";
  onSuccess?: () => void;
}

const PaymentModal = ({ open, onOpenChange, plan, onSuccess }: PaymentModalProps) => {
  const { updatePlan } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const price = "$9";

  const handlePay = async () => {
    setProcessing(true);
    // Simulated payment delay
    await new Promise((r) => setTimeout(r, 2000));
    await updatePlan(plan);
    setProcessing(false);
    setSuccess(true);
    toast({ title: "Payment successful!", description: `You're now on the ${plan} plan.` });
    setTimeout(() => {
      setSuccess(false);
      onOpenChange(false);
      onSuccess?.();
    }, 1500);
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Payment Successful!</h3>
            <p className="text-sm text-muted-foreground">Welcome to the {plan} plan</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Details
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — {price}/month
          </p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Card Number</Label>
            <Input
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Expiry</Label>
              <Input placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
            <div>
              <Label>CVC</Label>
              <Input placeholder="123" value={cvc} onChange={(e) => setCvc(e.target.value)} />
            </div>
          </div>
          <Button className="w-full" onClick={handlePay} disabled={processing}>
            {processing ? "Processing..." : `Pay ${price}/month`}
          </Button>
          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> Secure sandbox payment (test mode)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
