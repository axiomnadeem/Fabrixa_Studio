// =============================================================
// SubscriptionRequiredDialog — global, imperative dialog shown
// whenever a gated feature is invoked without an active sub.
// Usage from anywhere: openSubscriptionDialog("HD_RENDER_4K").
// =============================================================
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FeatureCostKey } from "@/lib/fabrixa/entitlements";

type Listener = (feature: FeatureCostKey | null) => void;
const listeners = new Set<Listener>();
let current: FeatureCostKey | null = null;

export function openSubscriptionDialog(feature: FeatureCostKey) {
  current = feature;
  listeners.forEach((l) => l(feature));
}
export function closeSubscriptionDialog() {
  current = null;
  listeners.forEach((l) => l(null));
}

export function SubscriptionRequiredDialog() {
  const [feature, setFeature] = useState<FeatureCostKey | null>(current);

  useEffect(() => {
    const l: Listener = (f) => setFeature(f);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  return (
    <Dialog open={!!feature} onOpenChange={(o) => !o && closeSubscriptionDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subscription required</DialogTitle>
          <DialogDescription>
            <strong>{feature}</strong> is a paid feature. Subscribe to a plan to
            unlock exports, HD renders, AI generation, project saves, and the
            showroom. Your free browsing of the editor stays available.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={closeSubscriptionDialog}>Not now</Button>
          <Button onClick={() => {
            closeSubscriptionDialog();
            // Existing PricingDialog can be opened via its own trigger;
            // dispatch a CustomEvent so any page can listen.
            window.dispatchEvent(new CustomEvent("fabrixa:open-pricing"));
          }}>See plans</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
