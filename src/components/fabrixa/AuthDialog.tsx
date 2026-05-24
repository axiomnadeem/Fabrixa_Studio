import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/lib/fabrixa/useAuth";
import { Loader2 } from "lucide-react";
import { useSubscriptionStore } from "@/lib/fabrixa/subscriptionStore";
import adminConfig from "../../../admin.json";

const cleanMsg = (m: string) =>
  m
    .replace(/^Supabase: /, "")
    .replace(/^AuthApiError: /, "")
    .replace(/^Firebase: /, "")
    .trim();

interface AdminUser {
  id: string;
  password: string;
  label: string;
}
const ADMIN_USERS = (adminConfig as { users: AdminUser[] }).users ?? [];

interface FormProps {
  onSuccess?: () => void;
  variant?: "card" | "plain" | "glass";
}

export function AuthForm({ onSuccess, variant = "plain" }: FormProps) {
  const { signInEmail, signUpEmail, signInGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const setAdminMode = useSubscriptionStore((s) => s.setAdminMode);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const matched = ADMIN_USERS.find(
      (u) => u.id === email.trim() && u.password === password,
    );
    if (matched) {
      setAdminMode(true);
      toast.success(`Admin bypass — ${matched.label}`);
      onSuccess?.();
      return;
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        await signInEmail(email, password);
        toast.success("Welcome back");
        onSuccess?.();
      } else {
        await signUpEmail(email, password);
        toast.success("Check your email to confirm, then sign in.");
      }
    } catch (err) {
      toast.error(
        cleanMsg(err instanceof Error ? err.message : "Authentication failed"),
      );
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      await signInGoogle();
    } catch (err) {
      toast.error(
        cleanMsg(err instanceof Error ? err.message : "Google sign-in failed"),
      );
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    try {
      await resetPassword(email);
      toast.success("Password reset email sent");
    } catch (err) {
      toast.error(
        cleanMsg(err instanceof Error ? err.message : "Failed to send reset email"),
      );
    }
  };

  const wrap =
    variant === "card"
      ? "rounded-2xl border bg-card p-6 shadow-xl"
      : variant === "glass"
        ? ""
        : "";

  const showHeader = variant === "card" || variant === "glass";

  return (
    <div className={wrap}>
      {showHeader && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight">
            {variant === "glass" ? "Welcome back" : "Sign in to Fabrixa"}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Google or email — your workspace unlocks after plan selection.
          </p>
        </div>
      )}
      <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
        </TabsList>
        <TabsContent value={mode} className="mt-4 space-y-4">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            disabled={busy}
            onClick={() => void google()}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue with Google
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-3" noValidate>
            <div>
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="auth-password">Password</Label>
              <Input
                id="auth-password"
                type="password"
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="h-11 w-full shadow-md" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
            {mode === "signin" && (
              <button
                type="button"
                className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
                onClick={() => void reset()}
              >
                Forgot password?
              </button>
            )}
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: Props) {
  const { user, loading } = useAuth();
  if (loading || user) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription>Access your Fabrixa workspace.</DialogDescription>
        </DialogHeader>
        <AuthForm onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
