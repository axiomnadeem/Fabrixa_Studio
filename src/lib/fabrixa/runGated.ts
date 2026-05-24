// Gated features: active plan → daily cap → coin balance → DB spend → action.
import { useCallback } from "react";
import { toast } from "sonner";
import {
  useEntitlements,
  useInvalidateEntitlements,
  checkDailyCap,
  checkCoinBalance,
  type FeatureCostKey,
} from "./entitlements";
import { persistFeatureSpend } from "./spendFeature";
import { useSubscriptionStore } from "./subscriptionStore";
import { openSubscriptionDialog } from "@/components/fabrixa/SubscriptionRequiredDialog";

export function useRunGated() {
  const { data: ent } = useEntitlements();
  const invalidate = useInvalidateEntitlements();

  return useCallback(
    async function runGated<T>(
      feature: FeatureCostKey,
      action: () => Promise<T> | T,
    ): Promise<T | null> {
      const adminMode = useSubscriptionStore.getState().adminMode;

      if (adminMode) {
        try {
          return await action();
        } catch (err) {
          toast.error(`Action failed: ${(err as Error).message}`);
          throw err;
        }
      }

      if (!ent || ent.subscriptionTier === "none") {
        openSubscriptionDialog(feature);
        return null;
      }

      const capError = checkDailyCap(ent, feature);
      if (capError) {
        toast.error(capError);
        return null;
      }

      const coinError = checkCoinBalance(ent, feature);
      if (coinError) {
        toast.error(coinError);
        return null;
      }

      const spend = await persistFeatureSpend(ent.userId, feature, ent);
      if (!spend.ok) {
        toast.error(`Could not charge: ${spend.message}`);
        return null;
      }

      useSubscriptionStore.setState({
        coinBalance: spend.patch.coinBalance,
        dailyAiRequestsRemaining: spend.patch.dailyAiRequestsRemaining ?? ent.dailyAiRequestsRemaining,
        dailyShowroomDownloadsCount:
          spend.patch.dailyShowroomDownloadsCount ?? ent.dailyShowroomDownloadsCount,
      });
      void invalidate();

      try {
        return await action();
      } catch (err) {
        toast.error(`Action failed: ${(err as Error).message}`);
        throw err;
      }
    },
    [ent, invalidate],
  );
}

export async function runGated<T>(
  _feature: FeatureCostKey,
  fn: () => Promise<T> | T,
): Promise<T | null> {
  console.warn("[runGated] legacy call — migrate to useRunGated()");
  return await fn();
}
