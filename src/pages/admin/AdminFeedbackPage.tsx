import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MessageSquare, RefreshCw, Send, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface FeedbackItem {
  id: string;
  user_id: string;
  enjoying_platform: boolean | null;
  likes_interface: boolean | null;
  has_issues: boolean | null;
  message: string | null;
  admin_reply: string | null;
  admin_replied_at: string | null;
  created_at: string;
  user_email?: string;
}

const AdminFeedbackPage = () => {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-api", { body: { action: "list_feedback" } });
      if (error) throw error;
      if (data?.feedback) setFeedback(data.feedback);
    } catch (e: any) {
      console.error("Failed to fetch feedback:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFeedback(); }, []);

  const handleReply = async (feedbackId: string, userId: string) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const { error } = await supabase.functions.invoke("admin-api", {
        body: { action: "reply_feedback", feedbackId, userId, reply: replyText.trim() },
      });
      if (error) throw error;
      toast({ title: "Reply sent!" });
      setReplyingTo(null);
      setReplyText("");
      fetchFeedback();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSendingReply(false);
  };

  const BoolBadge = ({ value, yesLabel, noLabel }: { value: boolean | null; yesLabel: string; noLabel: string }) => {
    if (value === null) return null;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
        value ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
      }`}>
        {value ? <ThumbsUp className="w-2.5 h-2.5" /> : <ThumbsDown className="w-2.5 h-2.5" />}
        {value ? yesLabel : noLabel}
      </span>
    );
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">User Feedback ({feedback.length})</h1>
        <Button variant="outline" size="sm" onClick={fetchFeedback}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
      </div>

      <div className="space-y-3">
        {feedback.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No feedback received yet.</p>
          </div>
        ) : (
          feedback.map((fb) => (
            <div key={fb.id} className="p-4 rounded-xl bg-card border border-border shadow-card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{fb.user_email || fb.user_id}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(fb.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <BoolBadge value={fb.enjoying_platform} yesLabel="Enjoying" noLabel="Not enjoying" />
                  <BoolBadge value={fb.likes_interface} yesLabel="Likes UI" noLabel="Dislikes UI" />
                  <BoolBadge value={fb.has_issues} yesLabel="Has issues" noLabel="No issues" />
                </div>
              </div>

              {fb.message && (
                <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3 mb-3">{fb.message}</p>
              )}

              {fb.admin_reply && (
                <div className="bg-primary/5 rounded-lg p-3 mb-3 border-l-2 border-primary">
                  <p className="text-xs font-medium text-primary mb-1">Admin Reply</p>
                  <p className="text-sm text-foreground">{fb.admin_reply}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {fb.admin_replied_at && format(new Date(fb.admin_replied_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              )}

              {replyingTo === fb.id ? (
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write your reply..."
                    className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex flex-col gap-1">
                    <Button size="sm" onClick={() => handleReply(fb.id, fb.user_id)} disabled={sendingReply} className="gap-1">
                      {sendingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Send
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyText(""); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setReplyingTo(fb.id)} className="gap-1.5 text-xs">
                  <MessageSquare className="w-3 h-3" /> {fb.admin_reply ? "Edit Reply" : "Reply"}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminFeedbackPage;
