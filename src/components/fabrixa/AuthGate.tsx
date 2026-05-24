// Strict gate — workspace only with Supabase-verified plan (or admin). No localStorage bypass.
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/fabrixa/useAuth";
import { useSubscriptionStore } from "@/lib/fabrixa/subscriptionStore";
import { useUserDocSync } from "@/lib/fabrixa/useUserDocSync";
import { useInvalidateEntitlements } from "@/lib/fabrixa/entitlements";
import { ensureUserProfile } from "@/lib/fabrixa/userProfile";
import { storeTierFromSupabase } from "@/lib/fabrixa/tierMap";
import { useWorkspaceAccess } from "@/lib/fabrixa/workspaceAccess";
import { MarketingLanding } from "@/components/fabrixa/MarketingLanding";
import { PlanSelectionPage } from "@/components/fabrixa/PlanSelectionPage";
import { WorkspaceGuard } from "@/components/fabrixa/WorkspaceGuard";

interface Props {
  children: React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const setUid = useSubscriptionStore((s) => s.setUid);
  const resetAll = useSubscriptionStore((s) => s.resetAll);
  const clearPlanState = useSubscriptionStore((s) => s.clearPlanState);
  const activateTier = useSubscriptionStore((s) => s.activateTier);
  const hydrateFromUserDoc = useSubscriptionStore((s) => s.hydrateFromUserDoc);
  const applyDailyResetIfNeeded = useSubscriptionStore(
    (s) => s.applyDailyResetIfNeeded,
  );
  const setAdminMode = useSubscriptionStore((s) => s.setAdminMode);
  const { signOut } = useAuth();

  const {
    user,
    ent,
    authLoading,
    entLoading,
    isAuthenticated,
    hasActivePlan,
    canAccessWorkspace,
    adminMode,
  } = useWorkspaceAccess();

  const invalidateEntitlements = useInvalidateEntitlements();
  const [pricingOpen, setPricingOpen] = useState(true);

  useEffect(() => {
    setUid(user?.uid ?? null);
  }, [user, setUid]);

  useEffect(() => {
    if (!user) {
      resetAll();
      return;
    }
    void ensureUserProfile(user.uid, user.email).then(() =>
      invalidateEntitlements(),
    );
  }, [user, resetAll, invalidateEntitlements]);

  useEffect(() => {
    if (!user || !ent || !hasActivePlan || adminMode) return;
    const storeTier = storeTierFromSupabase(ent.subscriptionTier);
    if (!storeTier) return;
    hydrateFromUserDoc({
      subscriptionTier: storeTier,
      basePlanExpiry: ent.basePlanExpiry
        ? new Date(ent.basePlanExpiry).getTime()
        : null,
      coinBalance: ent.coinBalance,
      dailyAllowance: ent.dailyAllowance,
      lastDailyResetAt: ent.lastDailyResetAt
        ? new Date(ent.lastDailyResetAt).getTime()
        : 0,
      hasAiPack: ent.hasAiPack,
      aiPackExpiry: ent.aiPackExpiry
        ? new Date(ent.aiPackExpiry).getTime()
        : null,
      dailyAiRequestsRemaining: ent.dailyAiRequestsRemaining,
      dailyShowroomDownloadsCount: ent.dailyShowroomDownloadsCount,
    });
  }, [ent, user, hasActivePlan, adminMode, hydrateFromUserDoc]);

  useEffect(() => {
    if (!user || adminMode) return;
    if (ent && ent.subscriptionTier === "none") clearPlanState();
  }, [user, ent, adminMode, clearPlanState]);

  useUserDocSync(canAccessWorkspace ? (user?.uid ?? null) : null);
  useEffect(() => {
    if (canAccessWorkspace) applyDailyResetIfNeeded();
  }, [canAccessWorkspace, applyDailyResetIfNeeded]);

  const handleSignOut = async () => {
    setAdminMode(false);
    resetAll();
    await signOut();
  };

  if (authLoading) return <LoadingScreen />;

  if (!isAuthenticated) return <MarketingLanding />;

  if (entLoading && !adminMode) return <LoadingScreen />;

  if (!hasActivePlan && user) {
    return (
      <PlanSelectionPage
        user={user}
        onSignOut={() => void handleSignOut()}
        pricingOpen={pricingOpen}
        onPricingOpenChange={setPricingOpen}
        onActivated={(tierId) => {
          const storeId = storeTierFromSupabase(tierId);
          if (storeId) activateTier(storeId);
          void invalidateEntitlements();
        }}
      />
    );
  }

  if (!canAccessWorkspace) return <LoadingScreen />;

  return <WorkspaceGuard>{children}</WorkspaceGuard>;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading your studio…</p>
    </div>
  );
}
