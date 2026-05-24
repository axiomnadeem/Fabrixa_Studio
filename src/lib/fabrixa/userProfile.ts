// Supabase `public.users` — provision on sign-in, sync subscription after payment.
import { getSupabase } from "./supabase";
import type { SubscriptionTier } from "./entitlements";
import {
  aiDailyCapFor,
  dailyCoinsForTier,
  showroomDailyCapFor,
} from "./entitlements";
import { canonicalTierMeta } from "./canonicalTiers";

const DEFAULT_ROW = {
  subscriptionTier: "none" as SubscriptionTier,
  coinBalance: 0,
  dailyAllowance: 0,
  hasAiPack: false,
  dailyAiRequestsRemaining: 0,
  dailyShowroomDownloadsCount: 0,
};

export async function ensureUserProfile(
  userId: string,
  email?: string | null,
): Promise<void> {
  const sb = getSupabase();
  const { data, error: readErr } = await sb
    .from("users")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();
  if (readErr) {
    console.warn("[userProfile] read failed:", readErr.message);
    return;
  }
  if (data) {
    if (email && data.email !== email) {
      await sb.from("users").update({ email }).eq("id", userId);
    }
    return;
  }

  const { error } = await sb.from("users").insert({
    id: userId,
    email: email ?? null,
    ...DEFAULT_ROW,
    lastDailyResetAt: new Date().toISOString(),
  });
  if (error) {
    // Trigger may have created the row — sync email only.
    if (email) {
      await sb.from("users").update({ email }).eq("id", userId);
    }
    if (!/duplicate|unique/i.test(error.message)) {
      console.warn("[userProfile] insert failed:", error.message);
    }
  }
}

export async function syncSubscriptionToSupabase(
  userId: string,
  tierId: SubscriptionTier,
): Promise<void> {
  if (tierId === "none") return;
  const meta = canonicalTierMeta(tierId);
  if (!meta) return;

  const expiry = new Date(
    Date.now() + meta.durationDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const daily = dailyCoinsForTier(tierId);
  const aiCap = aiDailyCapFor(tierId);
  const now = new Date().toISOString();

  const sb = getSupabase();
  const { error } = await sb.from("users").upsert(
    {
      id: userId,
      subscriptionTier: tierId,
      basePlanExpiry: expiry,
      coinBalance: daily,
      dailyAllowance: daily,
      dailyAiRequestsRemaining: aiCap,
      dailyShowroomDownloadsCount: 0,
      lastDailyResetAt: now,
      hasAiPack: tierId.startsWith("studio") || tierId.startsWith("enterprise"),
    },
    { onConflict: "id" },
  );
  if (error) console.warn("[userProfile] subscription sync failed:", error.message);
}

export { showroomDailyCapFor, aiDailyCapFor, dailyCoinsForTier };
