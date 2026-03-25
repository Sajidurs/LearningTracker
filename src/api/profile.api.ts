import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/models";

export const profileApi = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (error) throw error;
    return data as unknown as Profile;
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { error } = await supabase
      .from("profiles")
      .update(updates as any)
      .eq("user_id", userId);
    
    if (error) throw error;
  },

  async getJourneyCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("learning_journeys")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    
    if (error) throw error;
    return count ?? 0;
  },

  async getTopicCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("topics")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    
    if (error) throw error;
    return count ?? 0;
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop();
    const filePath = `${userId}/avatar.${ext}`;

    try {
      const { data: existingFiles } = await supabase.storage.from("avatars").list(userId);
      if (existingFiles && existingFiles.length > 0) {
        const oldPaths = existingFiles.map(f => `${userId}/${f.name}`);
        await supabase.storage.from("avatars").remove(oldPaths);
      }
    } catch (_) { }

    const { error } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return `${urlData.publicUrl}?t=${Date.now()}`;
  },

  async deactivateAccount() {
    const { error } = await supabase.functions.invoke("deactivate-account");
    if (error) throw error;
  }
};
