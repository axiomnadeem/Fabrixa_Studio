import { APP_DATA_0, type SubscriptionTierId } from "./APP_DATA_0";
import { useSubscriptionStore } from "./subscriptionStore";
import type { GarmentType, GarmentTypeId } from "./garments";
import { AVAILABLE_GARMENTS } from "./garmentCatalog";

export function isGarmentAllowedForTier(
  garmentId: GarmentTypeId,
  tierId: SubscriptionTierId | null,
  adminMode: boolean,
): boolean {
  if (adminMode) return true;
  if (!tierId) return false;
  const tier = APP_DATA_0.tiers[tierId];
  if (!tier) return false;
  const allowed = tier.allowedModels;
  if (allowed === "ALL") return true;
  return (allowed as readonly string[]).includes(garmentId);
}

export function garmentsForPlan(
  tierId: SubscriptionTierId | null,
  adminMode: boolean,
): GarmentType[] {
  return AVAILABLE_GARMENTS.filter((g) =>
    isGarmentAllowedForTier(g.id, tierId, adminMode),
  );
}

export function usePlanGarments(): GarmentType[] {
  const tierId = useSubscriptionStore((s) => s.subscriptionTier);
  const adminMode = useSubscriptionStore((s) => s.adminMode);
  return garmentsForPlan(tierId, adminMode);
}

export function useCanUseGarment(garmentId: GarmentTypeId): boolean {
  const tierId = useSubscriptionStore((s) => s.subscriptionTier);
  const adminMode = useSubscriptionStore((s) => s.adminMode);
  return isGarmentAllowedForTier(garmentId, tierId, adminMode);
}
