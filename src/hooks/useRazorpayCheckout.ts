// Razorpay checkout — creates order, verifies payment, syncs plan to Supabase.
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useSubscriptionStore } from "@/lib/fabrixa/subscriptionStore";
import type { SubscriptionTier } from "@/lib/fabrixa/entitlements";
import { storeTierFromSupabase } from "@/lib/fabrixa/tierMap";
import { canonicalTierMeta } from "@/lib/fabrixa/canonicalTiers";
import { syncSubscriptionToSupabase } from "@/lib/fabrixa/userProfile";
import { useInvalidateEntitlements } from "@/lib/fabrixa/entitlements";

type Plan =
  | { kind: "tier"; tierId: SubscriptionTier }
  | { kind: "aiPack" };

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (resp: unknown) => void) => void;
    };
  }
}

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function useRazorpayCheckout() {
  const [loading, setLoading] = useState(false);
  const activateTier = useSubscriptionStore((s) => s.activateTier);
  const activateAiPack = useSubscriptionStore((s) => s.activateAiPack);
  const uid = useSubscriptionStore((s) => s.uid);
  const invalidateEntitlements = useInvalidateEntitlements();

  const startCheckout = useCallback(
    async (plan: Plan) => {
      setLoading(true);
      try {
        const ok = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
        if (!ok) throw new Error("Failed to load Razorpay checkout");

        const orderRes = await fetch("/api/create-order", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ plan, uid }),
        });
        if (!orderRes.ok) {
          const txt = await orderRes.text();
          throw new Error(`Order failed: ${txt}`);
        }
        const order = (await orderRes.json()) as {
          order_id: string;
          amount: number;
          currency: string;
          key_id: string;
          label: string;
        };

        await new Promise<void>((resolve, reject) => {
          if (!window.Razorpay) return reject(new Error("Razorpay unavailable"));
          const rzp = new window.Razorpay({
            key: order.key_id,
            amount: order.amount,
            currency: order.currency,
            name: "Fabrixa",
            description: order.label,
            order_id: order.order_id,
            handler: async (resp: unknown) => {
              const r = resp as {
                razorpay_payment_id: string;
                razorpay_order_id: string;
                razorpay_signature: string;
              };
              try {
                const verify = await fetch("/api/verify-payment", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ ...r, plan, uid }),
                });
                if (!verify.ok) throw new Error(await verify.text());
                const verified = (await verify.json()) as {
                  subscriptionTier?: SubscriptionTier;
                  dailyAiRequestsRemaining?: number;
                };

                if (plan.kind === "tier") {
                  const meta = canonicalTierMeta(plan.tierId);
                  const storeId = storeTierFromSupabase(plan.tierId);
                  if (storeId) {
                    activateTier(storeId, {
                      durationDays: meta?.durationDays ?? 30,
                    });
                  }
                  if (uid) {
                    await syncSubscriptionToSupabase(uid, plan.tierId);
                  }
                  if (verified.dailyAiRequestsRemaining != null) {
                    useSubscriptionStore.setState({
                      dailyAiRequestsRemaining: verified.dailyAiRequestsRemaining,
                    });
                  }
                  void invalidateEntitlements();
                  toast.success(
                    meta ? `Activated ${meta.label}` : "Plan activated",
                  );
                } else {
                  activateAiPack();
                  toast.success("AI Pack activated");
                }
                resolve();
              } catch (e) {
                reject(e instanceof Error ? e : new Error("Verification failed"));
              }
            },
            modal: {
              ondismiss: () => reject(new Error("Payment cancelled")),
            },
            theme: { color: "#7c3aed" },
          });
          rzp.open();
        });
      } finally {
        setLoading(false);
      }
    },
    [activateTier, activateAiPack, uid, invalidateEntitlements],
  );

  return { startCheckout, loading };
}
