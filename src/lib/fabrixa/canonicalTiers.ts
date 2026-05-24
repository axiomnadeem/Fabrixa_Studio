// Billing tier metadata from APP_DATA_0.json (creator_1m, studio_1m, …).
import rootConfig from "../../../APP_DATA_0.json";
import type { SubscriptionTier } from "./entitlements";

type TierMeta = { label: string; priceInr: number; durationDays: number };

const ROOT = rootConfig as {
  tiers: Record<string, TierMeta>;
};

export const CANONICAL_TIERS = ROOT.tiers;

export function canonicalTierMeta(tierId: SubscriptionTier): TierMeta | null {
  if (tierId === "none") return null;
  return CANONICAL_TIERS[tierId] ?? null;
}

export function canonicalTierPriceInr(tierId: SubscriptionTier): number {
  return canonicalTierMeta(tierId)?.priceInr ?? 0;
}
