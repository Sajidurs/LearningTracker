import { useState } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const FeedbackWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [enjoying, setEnjoying] = useState<boolean | null>(null);
  const [likesInterface, setLikesInterface] = useState<boolean | null>(null);
  const [hasIssues, setHasIssues] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSending(true);
    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        enjoying_platform: enjoying,
        likes_interface: likesInterface,
        has_issues: hasIssues,
        message: message.trim() || null,
      } as any);
      if (error) throw error;

      // Create notification for user
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Feedback Sent",
        message: "Thank you for your feedback! Our team will review it.",
        type: "info",
      } as any);

      setSent(true);
      toast({ title: "Feedback sent!", description: "Thank you for your feedback." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  const resetForm = () => {
    setEnjoying(null);
    setLikesInterface(null);
    setHasIssues(null);
    setMessage("");
    setSent(false);
    setIsOpen(false);
  };

  const YesNoButton = ({ value, selected, onSelect, label }: { value: boolean; selected: boolean | null; onSelect: (v: boolean) => void; label: string }) => (
    <button
      onClick={() => onSelect(value)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        selected === value
          ? value
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-destructive/90 text-destructive-foreground shadow-sm"
          : "bg-muted hover:bg-muted/80 text-muted-foreground"
      }`}
    >
      {value ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
      {label}
    </button>
  );

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-14 right-0 w-80 bg-card rounded-2xl shadow-elevated border border-border p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Share Feedback</h3>
              <button onClick={resetForm} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            {sent ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <ThumbsUp className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Thank you!</p>
                <p className="text-xs text-muted-foreground mt-1">Your feedback has been submitted.</p>
                <Button size="sm" variant="outline" onClick={resetForm} className="mt-3 rounded-xl">Close</Button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Enjoying the platform?</span>
                    <div className="flex gap-1.5">
                      <YesNoButton value={true} selected={enjoying} onSelect={setEnjoying} label="Yes" />
                      <YesNoButton value={false} selected={enjoying} onSelect={setEnjoying} label="No" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Like the interface?</span>
                    <div className="flex gap-1.5">
                      <YesNoButton value={true} selected={likesInterface} onSelect={setLikesInterface} label="Yes" />
                      <YesNoButton value={false} selected={likesInterface} onSelect={setLikesInterface} label="No" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Facing any issues?</span>
                    <div className="flex gap-1.5">
                      <YesNoButton value={true} selected={hasIssues} onSelect={setHasIssues} label="Yes" />
                      <YesNoButton value={false} selected={hasIssues} onSelect={setHasIssues} label="No" />
                    </div>
                  </div>
                </div>

                <textarea
                  placeholder="Any additional feedback for the team..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full h-20 px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />

                <Button size="sm" onClick={handleSubmit} disabled={sending || (enjoying === null && likesInterface === null && hasIssues === null && !message.trim())}
                  className="w-full rounded-xl gap-1.5">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send Feedback
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-elevated flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <MessageSquare className="w-5 h-5" />
      </button>
    </div>
  );
};

export default FeedbackWidget;
