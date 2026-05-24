import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

const TEAM = "Axiom Dynamics";

export function AppHeader({
  right,
  minimal,
}: {
  right?: ReactNode;
  minimal?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-sm ring-1 ring-primary/20">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Fabrixa</div>
            {!minimal && (
              <div className="text-[10px] text-muted-foreground">
                Textile & garment studio
              </div>
            )}
          </div>
        </div>
        {right}
      </div>
    </header>
  );
}

export function AppFooter({ className }: { className?: string }) {
  return (
    <footer
      className={
        "border-t border-border/50 py-6 text-center text-[11px] text-muted-foreground " +
        (className ?? "")
      }
    >
      <p>
        Fabrixa · by <span className="font-medium text-foreground/75">{TEAM}</span>
      </p>
    </footer>
  );
}
