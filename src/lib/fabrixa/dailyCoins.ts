// Daily coin / AI cap renewal — syncs Supabase `users` with APP_DATA_0 tier allowances.
import { getSupabase } from "./supabase";
import {
  aiDailyCapFor,
  dailyCoinsForTier,
  isDailyResetDue,
  type Entitlement,
  type SubscriptionTier,
} from "./entitlements";

export async function applyDailyRenewalIfDue(
  userId: string,
  ent: Entitlement,
): Promise<Entitlement> {
  if (ent.subscriptionTier === "none") return ent;
  if (!isDailyResetDue(ent.lastDailyResetAt)) return ent;

  const coins = dailyCoinsForTier(ent.subscriptionTier);
  const aiCap = aiDailyCapFor(ent.subscriptionTier);
  const now = new Date().toISOString();

  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .update({
      coinBalance: coins,
      dailyAllowance: coins,
      dailyAiRequestsRemaining: aiCap,
      dailyShowroomDownloadsCount: 0,
      lastDailyResetAt: now,
    })
    .eq("id", userId)
    .select(
      `subscriptionTier, basePlanExpiry, coinBalance, dailyAllowance,
       hasAiPack, aiPackExpiry, dailyAiRequestsRemaining,
       lastDailyResetAt, dailyShowroomDownloadsCount`,
    )
    .maybeSingle();

  if (error || !data) {
    console.warn("[dailyCoins] renewal failed:", error?.message);
    return {
      ...ent,
      coinBalance: coins,
      dailyAiRequestsRemaining: aiCap,
      dailyShowroomDownloadsCount: 0,
      lastDailyResetAt: now,
    };
  }

  return {
    userId,
    subscriptionTier: (data.subscriptionTier ?? "none") as SubscriptionTier,
    basePlanExpiry: ent.basePlanExpiry,
    coinBalance: data.coinBalance ?? coins,
    dailyAllowance: data.dailyAllowance ?? coins,
    hasAiPack: data.hasAiPack ?? ent.hasAiPack,
    aiPackExpiry: data.aiPackExpiry ?? ent.aiPackExpiry,
    dailyAiRequestsRemaining: data.dailyAiRequestsRemaining ?? aiCap,
    lastDailyResetAt: data.lastDailyResetAt ?? now,
    dailyShowroomDownloadsCount: data.dailyShowroomDownloadsCount ?? 0,
  };
}
