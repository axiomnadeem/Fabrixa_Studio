import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/fabrixa/supabase";
import { initAuth } from "@/lib/fabrixa/authStore";
import { ensureUserProfile } from "@/lib/fabrixa/userProfile";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing in — Fabrixa" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    initAuth();
    const sb = getSupabase();

    const finish = async () => {
      const { data, error } = await sb.auth.getSession();
      if (error) {
        console.error("[auth/callback]", error.message);
        void navigate({ to: "/" });
        return;
      }
      if (data.session?.user) {
        await ensureUserProfile(
          data.session.user.id,
          data.session.user.email ?? null,
        );
      }
      if (window.location.hash.includes("access_token")) {
        history.replaceState(null, "", window.location.pathname);
      }
      void navigate({ to: "/" });
    };

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        session
      ) {
        void finish();
      }
    });

    void finish();

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Completing sign-in…</p>
    </div>
  );
}
