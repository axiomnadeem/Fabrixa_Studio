// CoinButton — wraps Shadcn <Button>, appends coin cost in the label, and
// hard-locks itself when the user can't afford the action.
import { forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useSubscriptionStore } from "@/lib/fabrixa/subscriptionStore";
import { type CoinAction } from "@/lib/fabrixa/APP_DATA_0";
import { Coins } from "lucide-react";

interface CoinButtonProps extends ButtonProps {
  action: CoinAction;
  qty?: number;
  /** Called only when the spend succeeds. */
  onSpend?: () => void | Promise<void>;
  /** When true, render only the icon + cost (no label). */
  iconOnly?: boolean;
}

export const CoinButton = forwardRef<HTMLButtonElement, CoinButtonProps>(
  function CoinButton(
    { action, qty = 1, onSpend, onClick, children, disabled, iconOnly, ...rest },
    ref,
  ) {
    const costOf = useSubscriptionStore((s) => s.costOf);
    const canAfford = useSubscriptionStore((s) => s.canAfford);
    const spend = useSubscriptionStore((s) => s.spend);
    const adminMode = useSubscriptionStore((s) => s.adminMode);

    const cost = costOf(action) * qty;
    const affordable = adminMode || canAfford(action, qty);
    const locked = !affordable;

    return (
      <Button
        ref={ref}
        {...rest}
        disabled={disabled || locked}
        onClick={async (e) => {
          if (locked) {
            e.preventDefault();
            return;
          }
          const result = spend(action, qty);
          if (!result.ok) {
            e.preventDefault();
            return;
          }
          await onSpend?.();
          onClick?.(e);
        }}
      >
        {locked ? (
          <span className="inline-flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 opacity-60" />
            Not enough coins
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {!iconOnly && children}
            <span className="inline-flex items-center gap-0.5 text-xs opacity-80">
              <Coins className="h-3 w-3" />
              {cost}
            </span>
          </span>
        )}
      </Button>
    );
  },
);
