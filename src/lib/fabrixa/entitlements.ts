// Entitlements — feature costs & daily caps from APP_DATA_0.json; users row in Supabase.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "./supabase";
import { useAuth } from "./useAuth";
import rootConfig from "../../../APP_DATA_0.json";

export type FeatureCostKey =
  | "STANDARD_EXPORT"
  | "SAVE_PROJECT"
  | "IMAGE_UPLOAD"
  | "HD_RENDER_4K"
  | "SHOWROOM_UNLOCK"
  | "AI_GENERATION"
  | "MASKED_APPLY"
  | "APPLY_TO_MODEL";

export type SubscriptionTier =
  | "none"
  | "creator_1m"    | "creator_6m"    | "creator_1y"
  | "studio_1m"     | "studio_6m"     | "studio_1y"
  | "enterprise_1m" | "enterprise_6m" | "enterprise_1y";

export interface Entitlement {
  userId: string;
  subscriptionTier: SubscriptionTier;
  basePlanExpiry: string | null;
  coinBalance: number;
  dailyAllowance: number;
  hasAiPack: boolean;
  aiPackExpiry: string | null;
  dailyAiRequestsRemaining: number;
  lastDailyResetAt: string | null;
  dailyShowroomDownloadsCount: number;
}

type RootCfg = {
  featureCosts: Record<FeatureCostKey, number>;
  dailyCaps: {
    ai: Record<string, number>;
    showroom: Record<string, number>;
  };
  tierDailyCoins: Record<string, number>;
};

const CFG = rootConfig as RootCfg;
const COSTS = CFG.featureCosts;

export function costOfFeature(f: FeatureCostKey): number {
  return COSTS[f] ?? 0;
}

export function tierFamily(
  tier: SubscriptionTier,
): "none" | "creator" | "studio" | "enterprise" {
  if (tier === "none") return "none";
  if (tier.startsWith("creator")) return "creator";
  if (tier.startsWith("studio")) return "studio";
  return "enterprise";
}

export function aiDailyCapFor(tier: SubscriptionTier): number {
  const family = tierFamily(tier);
  if (family === "none") return 0;
  return CFG.dailyCaps.ai[family] ?? 0;
}

export function showroomDailyCapFor(tier: SubscriptionTier): number {
  const family = tierFamily(tier);
  if (family === "none") return 0;
  return CFG.dailyCaps.showroom[family] ?? 0;
}

export function dailyCoinsForTier(tier: SubscriptionTier): number {
  const family = tierFamily(tier);
  if (family === "none") return 0;
  return CFG.tierDailyCoins[family] ?? 0;
}

export const entitlementsKey = ["entitlements"] as const;


async function fetchEntitlement(): Promise<Entitlement | null> {
  const sb = getSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return null;

  const { ensureUserProfile } = await import("./userProfile");
  await ensureUserProfile(auth.user.id, auth.user.email ?? null);

  const { data, error } = await sb
    .from("users")
    .select(
      `id, subscriptionTier, basePlanExpiry, coinBalance, dailyAllowance,
       hasAiPack, aiPackExpiry, dailyAiRequestsRemaining,
       lastDailyResetAt, dailyShowroomDownloadsCount`,
    )
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) {
    console.error("[entitlements] fetch failed:", error.message);
    return null;
  }
  if (!data) return null;

  const baseEnt: Entitlement = {
    userId: data.id,
    subscriptionTier: (data.subscriptionTier ?? "none") as SubscriptionTier,
    basePlanExpiry: data.basePlanExpiry ?? null,
    coinBalance: data.coinBalance ?? 0,
    dailyAllowance: data.dailyAllowance ?? 0,
    hasAiPack: data.hasAiPack ?? false,
    aiPackExpiry: data.aiPackExpiry ?? null,
    dailyAiRequestsRemaining: data.dailyAiRequestsRemaining ?? 0,
    lastDailyResetAt: data.lastDailyResetAt ?? null,
    dailyShowroomDownloadsCount: data.dailyShowroomDownloadsCount ?? 0,
  };

  const { applyDailyRenewalIfDue } = await import("./dailyCoins");
  return applyDailyRenewalIfDue(auth.user.id, baseEnt);
}

export function useEntitlements() {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: [...entitlementsKey, user?.uid ?? "anon"],
    queryFn: fetchEntitlement,
    enabled: !authLoading && !!user,
    staleTime: 15_000,
  });
}

export function useInvalidateEntitlements() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: entitlementsKey });
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function isDailyResetDue(lastResetAtISO: string | null): boolean {
  if (!lastResetAtISO) return true;
  const t = new Date(lastResetAtISO).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t > DAY_MS;
}

function isPlanExpired(ent: Entitlement): boolean {
  if (ent.subscriptionTier === "none") return true;
  if (!ent.basePlanExpiry) return true;
  const t = new Date(ent.basePlanExpiry).getTime();
  return Number.isNaN(t) || t <= Date.now();
}

/**
 * Returns null if allowed; otherwise a user-facing error string.
 * AI_GENERATION requires BOTH daily cap headroom AND sufficient coins (checked separately in runGated).
 */
export function checkDailyCap(
  ent: Entitlement,
  feature: FeatureCostKey,
): string | null {
  if (isPlanExpired(ent)) return "Subscription expired.";
  const tier = ent.subscriptionTier;
  if (tier === "none") return null;

  if (feature === "AI_GENERATION") {
    const cap = aiDailyCapFor(tier);
    if (cap <= 0) return "AI is not included on your plan.";
    if (
      !isDailyResetDue(ent.lastDailyResetAt) &&
      (ent.dailyAiRequestsRemaining ?? 0) <= 0
    ) {
      return `Daily AI limit reached (${cap}/day).`;
    }
  }

  if (feature === "SHOWROOM_UNLOCK") {
    const cap = showroomDailyCapFor(tier);
    if (
      !isDailyResetDue(ent.lastDailyResetAt) &&
      (ent.dailyShowroomDownloadsCount ?? 0) >= cap
    ) {
      return `Daily showroom download limit reached (${cap}/day).`;
    }
  }

  return null;
}

export function checkCoinBalance(
  ent: Entitlement,
  feature: FeatureCostKey,
): string | null {
  const cost = costOfFeature(feature);
  if (cost <= 0) return null;
  if ((ent.coinBalance ?? 0) < cost) {
    return `Insufficient coins — need ${cost}, you have ${ent.coinBalance ?? 0}.`;
  }
  return null;
}
