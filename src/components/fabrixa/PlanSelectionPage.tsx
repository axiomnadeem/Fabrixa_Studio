import { LogOut, Sparkles, Coins, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader, AppFooter } from "@/components/fabrixa/AppChrome";
import { PricingDialog } from "@/components/fabrixa/PricingDialog";
import type { FabrixaUser } from "@/lib/fabrixa/useAuth";
import type { SubscriptionTier } from "@/lib/fabrixa/entitlements";

interface Props {
  user: FabrixaUser;
  onSignOut: () => void;
  pricingOpen: boolean;
  onPricingOpenChange: (open: boolean) => void;
  onActivated: (tierId: SubscriptionTier) => void;
}

export function PlanSelectionPage({
  user,
  onSignOut,
  pricingOpen,
  onPricingOpenChange,
  onActivated,
}: Props) {
  const name = user.displayName || user.email?.split("@")[0] || "Designer";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,hsl(var(--primary)/0.14),transparent_60%)]" />
      <AppHeader
        right={
          <Button variant="ghost" size="sm" onClick={() => void onSignOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        }
      />
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12">
        <div className="rounded-3xl border border-white/25 bg-white/40 p-1 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
        <div className="rounded-[1.35rem] border border-white/30 bg-background/80 p-8 backdrop-blur-xl dark:border-white/10 dark:bg-background/65 sm:p-10">
          <p className="text-sm font-medium text-primary">Welcome, {name}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Activate your plan</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Your account is ready. Choose Creator, Studio, or Enterprise to unlock
            the full workspace, daily coins, and AI allowances.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Info icon={Coins} title="Coin economy" text="Pay per export, save, and AI run" />
            <Info icon={Calendar} title="Flexible billing" text="Monthly, 6-month, or yearly" />
            <Info icon={Sparkles} title="Instant access" text="Workspace opens after checkout" />
          </div>
          <Button size="lg" className="mt-8" onClick={() => onPricingOpenChange(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            View plans & pricing
          </Button>
        </div>
        </div>
      </main>
      <AppFooter />
      <PricingDialog open={pricingOpen} onOpenChange={onPricingOpenChange} onActivated={onActivated} />
    </div>
  );
}

function Info({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Coins;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <Icon className="mb-2 h-4 w-4 text-primary" />
      <div className="text-xs font-medium">{title}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{text}</div>
    </div>
  );
}
