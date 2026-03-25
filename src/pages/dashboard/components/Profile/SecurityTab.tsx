import { useState } from "react";
import { authApi } from "@/api/auth.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Key, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { profileApi } from "@/api/profile.api";
import { journeysApi } from "@/api/journeys.api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const SecurityTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Invalid password", description: "Password must be at least 6 characters long.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await authApi.updatePassword(newPassword);
      if (error) throw error;
      toast({ title: "Password updated successfully" });
      
      if (user?.email) {
        journeysApi.triggerEmail(user.email, "password_update").catch(() => {
          toast({ title: "Notice", description: "Password updated but confirmation email failed to send.", variant: "destructive" });
        });
      }
      setNewPassword("");
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (confirm("Are you sure you want to deactivate your account? This will hide your journeys from the public directory.")) {
      setDeactivating(true);
      try {
        await profileApi.deactivateAccount();
        await authApi.signOut();
        navigate("/");
        toast({ title: "Account deactivated", description: "You have been logged out." });
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      } finally {
        setDeactivating(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground">Security Settings</h3>
        <p className="text-sm text-muted-foreground">Manage your password and account security.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">New Password</Label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              type="password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              className="pl-10 h-11 rounded-xl"
              placeholder="••••••••" 
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handlePasswordUpdate} disabled={loading || newPassword.length < 6} className="h-10 px-6 rounded-xl">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Update Password
          </Button>
        </div>
      </div>

      <div className="pt-6 border-t border-border mt-8">
        <h3 className="text-lg font-bold text-destructive flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5" /> Danger Zone
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Deactivating your account will hide your profile and all learning journeys.</p>
        <Button variant="destructive" onClick={handleDeactivate} disabled={deactivating} className="h-10 rounded-xl">
          {deactivating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Deactivate Account
        </Button>
      </div>
    </div>
  );
};
