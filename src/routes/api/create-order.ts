// POST /api/create-order — Razorpay order from canonical tier prices (APP_DATA_0.json).
import { createFileRoute } from "@tanstack/react-router";
import { APP_DATA_0 } from "@/lib/fabrixa/APP_DATA_0";
import {
  canonicalTierMeta,
  canonicalTierPriceInr,
} from "@/lib/fabrixa/canonicalTiers";
import type { SubscriptionTier } from "@/lib/fabrixa/entitlements";

type Plan =
  | { kind: "tier"; tierId: SubscriptionTier }
  | { kind: "aiPack" };

function amountPaise(plan: Plan): { amount: number; label: string } {
  if (plan.kind === "tier") {
    const meta = canonicalTierMeta(plan.tierId);
    if (!meta) throw new Error("Unknown tier");
    return {
      amount: canonicalTierPriceInr(plan.tierId) * 100,
      label: `Fabrixa ${meta.label}`,
    };
  }
  return {
    amount: APP_DATA_0.aiPack.priceInr * 100,
    label: "Fabrixa AI Pack",
  };
}

export const Route = createFileRoute("/api/create-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { plan: Plan; uid?: string | null };
          const { amount, label } = amountPaise(body.plan);

          const { rzp_key_id, rzp_key_secret, currency } = APP_DATA_0.razorpay;

          const isDummy =
            /DUMMY|REPLACE_ME|12345/i.test(rzp_key_id) ||
            /DUMMY|REPLACE_ME/i.test(rzp_key_secret);

          if (isDummy) {
            return Response.json({
              order_id: `order_demo_${Date.now()}`,
              amount,
              currency,
              key_id: rzp_key_id,
              label,
              _demo: true,
            });
          }

          const auth = btoa(`${rzp_key_id}:${rzp_key_secret}`);
          const res = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Basic ${auth}`,
            },
            body: JSON.stringify({
              amount,
              currency,
              receipt: `rcpt_${Date.now()}`,
              notes: { uid: body.uid ?? "anon", plan: JSON.stringify(body.plan) },
            }),
          });
          if (!res.ok) {
            const txt = await res.text();
            return new Response(`Razorpay error: ${txt}`, { status: 502 });
          }
          const order = (await res.json()) as { id: string };
          return Response.json({
            order_id: order.id,
            amount,
            currency,
            key_id: rzp_key_id,
            label,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Bad request";
          return new Response(msg, { status: 400 });
        }
      },
    },
  },
});
