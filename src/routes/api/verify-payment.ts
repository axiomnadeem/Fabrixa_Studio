// POST /api/verify-payment — verifies Razorpay signature, returns plan metadata.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { APP_DATA_0 } from "@/lib/fabrixa/APP_DATA_0";
import { canonicalTierMeta } from "@/lib/fabrixa/canonicalTiers";
import { storeTierFromSupabase } from "@/lib/fabrixa/tierMap";
import {
  aiDailyCapFor,
  dailyCoinsForTier,
  type SubscriptionTier,
} from "@/lib/fabrixa/entitlements";

type Plan =
  | { kind: "tier"; tierId: SubscriptionTier }
  | { kind: "aiPack" };

interface VerifyBody {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  plan: Plan;
  uid?: string | null;
}

function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const Route = createFileRoute("/api/verify-payment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as VerifyBody;
          const { rzp_key_secret } = APP_DATA_0.razorpay;
          const isDummy =
            /DUMMY|REPLACE_ME/i.test(rzp_key_secret) ||
            body.razorpay_order_id.startsWith("order_demo_");

          if (!isDummy) {
            const ok = verifySignature(
              body.razorpay_order_id,
              body.razorpay_payment_id,
              body.razorpay_signature,
              rzp_key_secret,
            );
            if (!ok) return new Response("Invalid signature", { status: 401 });
          }

          const now = Date.now();
          if (body.plan.kind === "tier") {
            const meta = canonicalTierMeta(body.plan.tierId);
            if (!meta) return new Response("Unknown tier", { status: 400 });
            const storeTier = storeTierFromSupabase(body.plan.tierId);
            const storeDef = storeTier ? APP_DATA_0.tiers[storeTier] : null;
            const daily = dailyCoinsForTier(body.plan.tierId);
            const aiCap = aiDailyCapFor(body.plan.tierId);
            const durationMs = meta.durationDays * DAY_MS;
            return Response.json({
              ok: true,
              uid: body.uid ?? null,
              subscriptionTier: body.plan.tierId,
              storeTier,
              basePlanExpiry: now + durationMs,
              coinBalance: storeDef?.dailyAllowance ?? daily,
              dailyAllowance: storeDef?.dailyAllowance ?? daily,
              dailyAiRequestsRemaining: aiCap,
              dailyShowroomDownloadsCount: 0,
              lastDailyResetAt: now,
            });
          }
          return Response.json({
            ok: true,
            uid: body.uid ?? null,
            hasAiPack: true,
            aiPackExpiry: now + APP_DATA_0.aiPack.durationDays * DAY_MS,
            dailyAiRequestsRemaining: APP_DATA_0.aiPack.dailyRequests,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Bad request";
          return new Response(msg, { status: 400 });
        }
      },
    },
  },
});
