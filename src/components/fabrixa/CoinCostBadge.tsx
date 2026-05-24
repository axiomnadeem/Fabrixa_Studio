// CoinCostBadge — tiny inline "⟡ N" pill rendered inside Buttons to
// communicate the exact coin cost of an action. Reads costs from the
// central featureCosts table so prices stay in one place.
import { Coins } from "lucide-react";
import { costOfFeature, type FeatureCostKey } from "@/lib/fabrixa/entitlements";
import { cn } from "@/lib/utils";

interface Props {
  feature: FeatureCostKey;
  /** Override for variable-cost actions (e.g. masked apply at half cost). */
  overrideCost?: number;
  className?: string;
}

export function CoinCostBadge({ feature, overrideCost, className }: Props) {
  const cost = overrideCost ?? costOfFeature(feature);
  if (cost <= 0) return null;
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        className,
      )}
    >
      <Coins className="h-2.5 w-2.5" />
      {cost}
    </span>
  );
}
