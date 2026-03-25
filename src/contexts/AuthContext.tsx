import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { authApi } from "@/api/auth.api";
import { profileApi } from "@/api/profile.api";
import { billingApi } from "@/api/billing.api";
import { Profile } from "@/types/models";

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

  const fetchProfileData = async (userId: string) => {
    try {
      const data = await profileApi.getProfile(userId);
      setProfile(data);
    } catch (e) {
      console.error("Error fetching profile:", e);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileData(user.id);
      try {
        await billingApi.checkSubscription();
        await fetchProfileData(user.id);
      } catch (_) {}
    }
  };

  useEffect(() => {
    let isMounted = true;
    let initialSessionHandled = false;

    const { data: { subscription } } = authApi.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        if (!initialSessionHandled) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            if (!isMounted) return;
            fetchProfileData(session.user.id);
          }, 0);
          
          setTimeout(async () => {
            if (!isMounted) return;
            try {
              await billingApi.checkSubscription();
              if (isMounted) await fetchProfileData(session.user.id);
            } catch (_) {}
          }, 1000);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    authApi.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfileData(session.user.id);
        if (isMounted) {
          try {
            await billingApi.checkSubscription();
            if (isMounted) await fetchProfileData(session.user.id);
          } catch (_) {}
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
    const { error } = await authApi.signUp(email, password, fullName);
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await authApi.signIn(email, password);
    return { error };
  };

  const signOut = async () => {
    await authApi.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const updatePlan = async (plan: "free" | "paid") => {
    if (!user) return;
    await profileApi.updateProfile(user.id, { plan });
    await refreshProfile();
  };

  const signInWithGoogle = async () => {
    await authApi.signInWithGoogle();
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
