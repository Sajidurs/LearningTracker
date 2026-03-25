import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { profileApi } from "@/api/profile.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Camera, Save, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const ProfileTab = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(profile?.show_on_leaderboard ?? true);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await profileApi.updateProfile(user.id, { 
        full_name: fullName,
        show_on_leaderboard: showOnLeaderboard 
      });
      await refreshProfile();
      toast({ title: "Profile updated successfully!" });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setUploadLoading(true);
    try {
      const url = await profileApi.uploadAvatar(user.id, file);
      await profileApi.updateProfile(user.id, { avatar_url: url });
      await refreshProfile();
      toast({ title: "Avatar updated!" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground">Profile Information</h3>
        <p className="text-sm text-muted-foreground">Update your personal details here.</p>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full border-4 border-background shadow-elevated bg-muted overflow-hidden">
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                 {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "?"}
               </div>
             )}
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 transition-transform">
             <Camera className="w-4 h-4" />
             <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleAvatarUpload} disabled={uploadLoading} />
          </div>
        </div>
        <div className="flex-1">
          <Label htmlFor="fullName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Full Name</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 rounded-xl" />
        </div>
      </div>
      
      <div>
        <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Email Address</Label>
        <Input id="email" value={user?.email || ""} disabled className="h-11 rounded-xl bg-muted/50 border-border/50 opacity-70" />
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="leaderboard" className="text-sm font-semibold">Public Leaderboard</Label>
          <p className="text-xs text-muted-foreground">Show your profile and rank on the leaderboards.</p>
        </div>
        <Switch 
          id="leaderboard" 
          checked={showOnLeaderboard} 
          onCheckedChange={setShowOnLeaderboard} 
        />
      </div>
      
      <div className="pt-4 flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={loading || (fullName === profile?.full_name && showOnLeaderboard === (profile?.show_on_leaderboard ?? true))} 
          className="gap-2 h-11 px-8 rounded-xl font-medium"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
        </Button>
      </div>
    </div>
  );
};
