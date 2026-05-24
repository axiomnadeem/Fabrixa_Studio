// Supabase auth hook — Firebase-compatible user shape for existing UI.
import { useCallback, useSyncExternalStore } from "react";
import { getSupabase } from "./supabase";
import { authCallbackUrl, resetPasswordUrl } from "./appOrigin";
import {
  getAuthState,
  subscribeAuth,
  type FabrixaUser,
} from "./authStore";

export type { FabrixaUser };

export interface AuthState {
  user: FabrixaUser | null;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export function useAuth(): AuthState {
  const state = useSyncExternalStore(
    subscribeAuth,
    getAuthState,
    () => ({ user: null, loading: true }),
  );

  const signInEmail = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string) => {
    const redirectTo = authCallbackUrl();
    const { data, error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
    if (data.user) {
      const { ensureUserProfile } = await import("./userProfile");
      await ensureUserProfile(data.user.id, data.user.email ?? email.trim());
    }
  }, []);

  const signInGoogle = useCallback(async () => {
    const redirectTo = authCallbackUrl();
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: false,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: resetPasswordUrl() },
    );
    if (error) throw error;
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    signInEmail,
    signUpEmail,
    signInGoogle,
    signOut,
    resetPassword,
  };
}
