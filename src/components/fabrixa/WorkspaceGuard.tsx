import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceAccess } from "@/lib/fabrixa/workspaceAccess";

interface Props {
  children: React.ReactNode;
}

export function WorkspaceGuard({ children }: Props) {
  const { canAccessWorkspace, isAuthenticated, hasActivePlan, entLoading } =
    useWorkspaceAccess();

  if (!canAccessWorkspace) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Workspace locked</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {!isAuthenticated
              ? "Sign in to open the design studio."
              : !hasActivePlan
                ? "Choose a subscription plan to continue."
                : entLoading
                  ? "Verifying your subscription…"
                  : "Access could not be verified."}
          </p>
        </div>
        {entLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
