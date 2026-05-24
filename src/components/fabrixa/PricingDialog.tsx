// PricingDialog — 3x3 grid: Creator / Studio / Enterprise × 1M / 6M / 1Y.
// Uses canonical database tier IDs and rupee prices per the spec.
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { useEntitlements } from "@/lib/fabrixa/entitlements";
import type { SubscriptionTier } from "@/lib/fabrixa/entitlements";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onActivated?: (tierId: SubscriptionTier) => void;
}

type DurationKey = "1m" | "6m" | "1y";

interface TierRow {
  family: "creator" | "studio" | "enterprise";
  label: string;
  highlight?: boolean;
  features: string[];
  prices: Record<DurationKey, { id: SubscriptionTier; inr: number }>;
}

const ROWS: TierRow[] = [
  {
    family: "creator",
    label: "Creator",
    features: [
      "Solo creator workflow",
      "Core garments + materials",
      "Standard exports",
      "2 AI generations / day",
    ],
    prices: {
      "1m": { id: "creator_1m", inr: 4000 },
      "6m": { id: "creator_6m", inr: 21000 },
      "1y": { id: "creator_1y", inr: 44000 },
    },
  },
  {
    family: "studio",
    label: "Studio",
    highlight: true,
    features: [
      "All garments & materials",
      "HD 4K renders",
      "10 AI generations / day",
      "Showroom downloads",
    ],
    prices: {
      "1m": { id: "studio_1m", inr: 16000 },
      "6m": { id: "studio_6m", inr: 90000 },
      "1y": { id: "studio_1y", inr: 185000 },
    },
  },
  {
    family: "enterprise",
    label: "Enterprise",
    features: [
      "Everything in Studio",
      "Custom .glb upload",
      "25 AI generations / day",
      "Priority support",
    ],
    prices: {
      "1m": { id: "enterprise_1m", inr: 25000 },
      "6m": { id: "enterprise_6m", inr: 135000 },
      "1y": { id: "enterprise_1y", inr: 278000 },
    },
  },
];

const DURATION_LABEL: Record<DurationKey, string> = {
  "1m": "Monthly",
  "6m": "6 Months",
  "1y": "Yearly",
};

export function PricingDialog({ open, onOpenChange, onActivated }: Props) {
  const { startCheckout, loading } = useRazorpayCheckout();
  const [pending, setPending] = useState<SubscriptionTier | null>(null);
  const [duration, setDuration] = useState<DurationKey>("1m");
  const { data: ent } = useEntitlements();
  const currentTier = ent?.subscriptionTier ?? "none";

  const buyTier = async (tierId: SubscriptionTier) => {
    setPending(tierId);
    try {
      // Legacy checkout shape: cast through unknown for the new tier IDs.
      await startCheckout({ kind: "tier", tierId });
      onActivated?.(tierId);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Choose your plan</DialogTitle>
          <DialogDescription>
            Pick a billing cycle, then a tier. Longer cycles save more.
          </DialogDescription>
        </DialogHeader>

        {/* Duration toggle */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border bg-muted/30 p-1">
            {(Object.keys(DURATION_LABEL) as DurationKey[]).map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  duration === d
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {DURATION_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        {/* 3-tier grid for the chosen duration */}
        <div className="mt-2 grid gap-4 md:grid-cols-3">
          {ROWS.map((row) => {
            const price = row.prices[duration];
            const isCurrent = currentTier === price.id;
            const isLoading = pending === price.id || loading;
            return (
              <div
                key={row.family}
                className={`rounded-xl border p-5 ${
                  row.highlight ? "border-primary shadow-lg" : ""
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold">{row.label}</h3>
                  {row.highlight && <Badge>Popular</Badge>}
                </div>
                <p className="mt-2 text-3xl font-bold">
                  ₹{price.inr.toLocaleString("en-IN")}
                  <span className="text-sm font-normal text-muted-foreground">
                    {duration === "1m" ? "/mo" : duration === "6m" ? "/6mo" : "/yr"}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{price.id}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {row.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full"
                  variant={row.highlight ? "default" : "outline"}
                  disabled={isLoading || isCurrent}
                  onClick={() => buyTier(price.id)}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isCurrent ? "Current plan" : "Choose plan"}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
