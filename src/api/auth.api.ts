import { supabase } from "@/integrations/supabase/client";

export const authApi = {
  async getSession() {
    return supabase.auth.getSession();
  },
  async getUser() {
    return supabase.auth.getUser();
  },
  async signUp(email: string, password: string, fullName: string) {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
  },
  async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },
  async signOut() {
    return supabase.auth.signOut();
  },
  async signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    });
  },
  async updatePassword(password: string) {
    return supabase.auth.updateUser({ password });
  },
  onAuthStateChange(callback: (event: any, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};
