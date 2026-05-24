// Persists feature spend to Supabase `users` — coins + daily counters (APP_DATA_0 costs).
import { getSupabase } from "./supabase";
import {
  costOfFeature,
  type Entitlement,
  type FeatureCostKey,
} from "./entitlements";

export interface SpendPatch {
  coinBalance: number;
  dailyAiRequestsRemaining?: number;
  dailyShowroomDownloadsCount?: number;
}

export function computeSpendPatch(
  ent: Entitlement,
  feature: FeatureCostKey,
): SpendPatch {
  const cost = costOfFeature(feature);
  const patch: SpendPatch = {
    coinBalance: Math.max(0, (ent.coinBalance ?? 0) - cost),
  };
  if (feature === "AI_GENERATION") {
    patch.dailyAiRequestsRemaining = Math.max(
      0,
      (ent.dailyAiRequestsRemaining ?? 0) - 1,
    );
  }
  if (feature === "SHOWROOM_UNLOCK") {
    patch.dailyShowroomDownloadsCount =
      (ent.dailyShowroomDownloadsCount ?? 0) + 1;
  }
  return patch;
}

type UsersRow = {
  coinBalance: number;
  dailyAiRequestsRemaining: number;
  dailyShowroomDownloadsCount: number;
};

/** Guarded row update — only succeeds if balance >= cost (atomic). */
export async function persistFeatureSpend(
  userId: string,
  feature: FeatureCostKey,
  ent: Entitlement,
): Promise<
  | { ok: true; patch: SpendPatch; row: UsersRow }
  | { ok: false; message: string }
> {
  const cost = costOfFeature(feature);
  if (cost <= 0) {
    return {
      ok: true,
      patch: computeSpendPatch(ent, feature),
      row: {
        coinBalance: ent.coinBalance,
        dailyAiRequestsRemaining: ent.dailyAiRequestsRemaining,
        dailyShowroomDownloadsCount: ent.dailyShowroomDownloadsCount,
      },
    };
  }

  const patch = computeSpendPatch(ent, feature);
  const sb = getSupabase();

  const updatePayload: Record<string, number> = {
    coinBalance: patch.coinBalance,
  };
  if (patch.dailyAiRequestsRemaining != null) {
    updatePayload.dailyAiRequestsRemaining = patch.dailyAiRequestsRemaining;
  }
  if (patch.dailyShowroomDownloadsCount != null) {
    updatePayload.dailyShowroomDownloadsCount = patch.dailyShowroomDownloadsCount;
  }

  const { data, error } = await sb
    .from("users")
    .update(updatePayload)
    .eq("id", userId)
    .gte("coinBalance", cost)
    .select("coinBalance, dailyAiRequestsRemaining, dailyShowroomDownloadsCount")
    .maybeSingle();

  if (!error && data) {
    return {
      ok: true,
      patch: {
        coinBalance: data.coinBalance,
        dailyAiRequestsRemaining: data.dailyAiRequestsRemaining,
        dailyShowroomDownloadsCount: data.dailyShowroomDownloadsCount,
      },
      row: data as UsersRow,
    };
  }

  // Optional RPC (if migration applied)
  const { error: rpcErr } = await sb.rpc("spend_feature", { p_cost: cost });
  if (!rpcErr) {
    const extra: Record<string, number> = {};
    if (patch.dailyAiRequestsRemaining != null) {
      extra.dailyAiRequestsRemaining = patch.dailyAiRequestsRemaining;
    }
    if (patch.dailyShowroomDownloadsCount != null) {
      extra.dailyShowroomDownloadsCount = patch.dailyShowroomDownloadsCount;
    }
    if (Object.keys(extra).length > 0) {
      await sb.from("users").update(extra).eq("id", userId);
    }
    return {
      ok: true,
      patch,
      row: {
        coinBalance: patch.coinBalance,
        dailyAiRequestsRemaining:
          patch.dailyAiRequestsRemaining ?? ent.dailyAiRequestsRemaining,
        dailyShowroomDownloadsCount:
          patch.dailyShowroomDownloadsCount ?? ent.dailyShowroomDownloadsCount,
      },
    };
  }

  return {
    ok: false,
    message:
      error?.message ||
      rpcErr?.message ||
      "Could not deduct coins — check Supabase RLS and users row.",
  };
}
