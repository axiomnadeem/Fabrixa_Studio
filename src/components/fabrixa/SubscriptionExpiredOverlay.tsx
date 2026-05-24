// Full-screen, un-closable overlay shown when the user's base plan has
// expired. Blocks the entire workspace until they renew via Razorpay.
import { useEffect, useState } from "react";
import { useSubscriptionStore } from "@/lib/fabrixa/subscriptionStore";
import { PricingDialog } from "./PricingDialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export function SubscriptionExpiredOverlay() {
  const isExpired = useSubscriptionStore((s) => s.isExpired());
  const adminMode = useSubscriptionStore((s) => s.adminMode);
  const tier = useSubscriptionStore((s) => s.subscriptionTier);
  const [pricingOpen, setPricingOpen] = useState(false);

  // Re-evaluate every minute to catch the exact moment of expiry without
  // requiring user interaction.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  if (adminMode || !isExpired) return null;

  return (
    <>
      <div
        // Max z-index, fully opaque blocking layer. Pointer events captured.
        style={{ zIndex: 2147483647 }}
        className="fixed inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="mx-4 max-w-md rounded-2xl border bg-card p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">
            {tier ? "Subscription expired" : "Subscribe to use Fabrixa"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {tier
              ? "Your monthly plan has ended. Renew to keep designing — your saved work is safe."
              : "Pick a plan to unlock the editor, 3D preview, exports, and the showroom."}
          </p>
          <Button
            className="mt-6 w-full"
            size="lg"
            onClick={() => setPricingOpen(true)}
          >
            {tier ? "Renew subscription" : "View plans"}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Secure payment via Razorpay
          </p>
        </div>
      </div>
      <PricingDialog open={pricingOpen} onOpenChange={setPricingOpen} />
    </>
  );
}
