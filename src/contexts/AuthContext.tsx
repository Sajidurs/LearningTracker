import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_points: number;
  plan: "free" | "paid";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePlan: (plan: "free" | "paid") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) setProfile(data as unknown as Profile);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      // Also sync subscription status
      try {
        await supabase.functions.invoke("check-subscription");
        // Re-fetch profile after subscription sync
        await fetchProfile(user.id);
      } catch (_) { /* ignore errors */ }
    }
  };

  useEffect(() => {
    let isMounted = true;
    let initialSessionHandled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        // Skip if this is the initial session (handled by getSession below)
        if (!initialSessionHandled) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            if (!isMounted) return;
            fetchProfile(session.user.id);
          }, 0);
          // Sync subscription status from Stripe (debounced)
          setTimeout(async () => {
            if (!isMounted) return;
            try {
              await supabase.functions.invoke("check-subscription");
              if (isMounted) await fetchProfile(session.user.id);
            } catch (_) { /* ignore */ }
          }, 1000);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Handle initial session only once
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
        // Sync subscription after profile is loaded
        if (isMounted) {
          try {
            await supabase.functions.invoke("check-subscription");
            if (isMounted) await fetchProfile(session.user.id);
          } catch (_) { /* ignore */ }
        }
      }
      if (isMounted) {
        setLoading(false);
        initialSessionHandled = true;
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const updatePlan = async (plan: "free" | "paid") => {
    if (!user) return;
    await supabase.from("profiles").update({ plan } as any).eq("user_id", user.id);
    await refreshProfile();
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    });
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile, updatePlan, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
