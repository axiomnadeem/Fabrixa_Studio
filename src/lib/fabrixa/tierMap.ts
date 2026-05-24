// Maps Supabase canonical tier IDs (creator_1m, studio_1m, …) to the
// Zustand permission tiers (starter_4000, studio_16000, prod_24000).
import type { SubscriptionTier } from "./entitlements";
import type { SubscriptionTierId } from "./APP_DATA_0";

export function storeTierFromSupabase(
  tier: SubscriptionTier,
): SubscriptionTierId | null {
  if (tier === "none") return null;
  if (tier.startsWith("creator")) return "starter_4000";
  if (tier.startsWith("studio")) return "studio_16000";
  if (tier.startsWith("enterprise")) return "prod_24000";
  return null;
}

export function isCanonicalTierActive(
  tier: SubscriptionTier,
  basePlanExpiry: string | null,
): boolean {
  if (tier === "none") return false;
  if (!basePlanExpiry) return false;
  const t = new Date(basePlanExpiry).getTime();
  return !Number.isNaN(t) && t > Date.now();
}
