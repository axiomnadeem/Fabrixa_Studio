import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings,
  User as UserIcon,
  Palette,
  SlidersHorizontal,
  Crown,
  Coins,
  Calendar,
  LogOut,
  HelpCircle,
  Trash2,
  Box,
} from "lucide-react";
import { toast } from "sonner";
import { THEMES, type ThemeId } from "@/lib/fabrixa/themes";
import { SCENE_PRESETS, type ScenePresetId } from "@/lib/fabrixa/scenePresets";
import { APP_DATA_0 } from "@/lib/fabrixa/APP_DATA_0";
import { useSubscriptionStore } from "@/lib/fabrixa/subscriptionStore";
import { useEntitlements } from "@/lib/fabrixa/entitlements";
import type { FabrixaUser } from "@/lib/fabrixa/useAuth";
import type { GarmentTypeId } from "@/lib/fabrixa/garments";
import { AVAILABLE_GARMENTS } from "@/lib/fabrixa/garmentCatalog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: FabrixaUser | null;
  onSignOut: () => void;
  onOpenPricing: () => void;
  onReplayTour: () => void;
  themeId: ThemeId;
  onThemeId: (id: ThemeId) => void;
  sceneId: ScenePresetId;
  onSceneId: (id: ScenePresetId) => void;
  autoRotate: boolean;
  onAutoRotate: (v: boolean) => void;
  showMannequin: boolean;
  onShowMannequin: (v: boolean) => void;
  showTilingOverlay: boolean;
  onShowTilingOverlay: (v: boolean) => void;
  defaultGarmentId: GarmentTypeId;
  onDefaultGarmentId: (id: GarmentTypeId) => void;
  coinBalance: number;
  ledgerBalance: number;
}

const PREFS_KEY = "fabrixa:prefs-v1";

export function SettingsPanel({
  open,
  onOpenChange,
  user,
  onSignOut,
  onOpenPricing,
  onReplayTour,
  themeId,
  onThemeId,
  sceneId,
  onSceneId,
  autoRotate,
  onAutoRotate,
  showMannequin,
  onShowMannequin,
  showTilingOverlay,
  onShowTilingOverlay,
  defaultGarmentId,
  onDefaultGarmentId,
  coinBalance,
  ledgerBalance,
}: Props) {
  const subTier = useSubscriptionStore((s) => s.subscriptionTier);
  const adminMode = useSubscriptionStore((s) => s.adminMode);
  const basePlanExpiry = useSubscriptionStore((s) => s.basePlanExpiry);
  const { data: ent } = useEntitlements();
  const [exportQuality, setExportQuality] = useState<"web" | "print" | "hd">(
    () => loadPrefs().exportQuality,
  );

  useEffect(() => {
    savePrefs({ exportQuality, defaultGarmentId, sceneId });
  }, [exportQuality, defaultGarmentId, sceneId]);

  const planLabel = ent?.subscriptionTier && ent.subscriptionTier !== "none"
    ? ent.subscriptionTier.replace(/_/g, " ")
    : subTier
      ? APP_DATA_0.tiers[subTier]?.label ?? subTier
      : "No plan";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Account, studio defaults, and appearance.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
            <TabsTrigger value="account" className="gap-1 text-xs">
              <UserIcon className="h-3.5 w-3.5" />
              Account
            </TabsTrigger>
            <TabsTrigger value="studio" className="gap-1 text-xs">
              <Box className="h-3.5 w-3.5" />
              Studio
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1 text-xs">
              <Palette className="h-3.5 w-3.5" />
              Look
            </TabsTrigger>
            <TabsTrigger value="prefs" className="gap-1 text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="mt-4 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
              <Avatar className="h-12 w-12 ring-2 ring-background">
                {user?.photoURL ? <AvatarImage src={user.photoURL} /> : null}
                <AvatarFallback>
                  {(user?.email ?? "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">
                  {user?.displayName ?? user?.email ?? "User"}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={onSignOut}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Sign out
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatCard
                icon={Crown}
                label="Plan"
                value={planLabel}
                hint={adminMode ? "Admin access" : "Managed in Supabase"}
              />
              <StatCard
                icon={Coins}
                label="Coins"
                value={String(ent?.coinBalance ?? coinBalance)}
                hint={`Credits ledger: ${ledgerBalance}`}
              />
            </div>

            <div className="rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Validity
              </div>
              <p className="mt-1 text-sm">
                {adminMode
                  ? "Unlimited (admin)"
                  : basePlanExpiry
                    ? `${Math.max(0, Math.ceil((basePlanExpiry - Date.now()) / 86_400_000))} days left`
                    : ent?.basePlanExpiry
                      ? `Expires ${new Date(ent.basePlanExpiry).toLocaleDateString()}`
                      : "—"}
              </p>
            </div>

            <Button className="w-full" onClick={onOpenPricing}>
              <Crown className="mr-2 h-4 w-4" />
              {subTier || (ent && ent.subscriptionTier !== "none")
                ? "Manage subscription"
                : "Upgrade plan"}
            </Button>
          </TabsContent>

          <TabsContent value="studio" className="mt-4 space-y-4">
            <PrefRow label="Default garment on open">
              <Select
                value={defaultGarmentId}
                onValueChange={(v) => onDefaultGarmentId(v as GarmentTypeId)}
              >
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_GARMENTS.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.emoji} {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PrefRow>
            <PrefRow label="Default 3D scene">
              <Select value={sceneId} onValueChange={(v) => onSceneId(v as ScenePresetId)}>
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCENE_PRESETS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PrefRow>
            <PrefRow label="Default export quality">
              <Select
                value={exportQuality}
                onValueChange={(v) =>
                  setExportQuality(v as "web" | "print" | "hd")
                }
              >
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web (1×)</SelectItem>
                  <SelectItem value="print">Print (2×)</SelectItem>
                  <SelectItem value="hd">HD (3×)</SelectItem>
                </SelectContent>
              </Select>
            </PrefRow>
          </TabsContent>

          <TabsContent value="appearance" className="mt-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onThemeId(t.id)}
                  className={`rounded-xl border p-2.5 text-left transition ${
                    themeId === t.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="mb-2 flex h-7 overflow-hidden rounded-md">
                    {t.swatch.map((c) => (
                      <div key={c} className="flex-1" style={{ background: c }} />
                    ))}
                  </div>
                  <div className="text-xs font-medium">{t.label}</div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="prefs" className="mt-4 space-y-3">
            <ToggleRow
              label="Auto-rotate 3D preview"
              checked={autoRotate}
              onCheckedChange={onAutoRotate}
            />
            <ToggleRow
              label="Show mannequin"
              checked={showMannequin}
              onCheckedChange={onShowMannequin}
            />
            <ToggleRow
              label="Tiling debug overlay"
              checked={showTilingOverlay}
              onCheckedChange={onShowTilingOverlay}
            />
            <Separator />
            <Button variant="outline" className="w-full" onClick={onReplayTour}>
              <HelpCircle className="mr-2 h-4 w-4" />
              Replay onboarding tour
            </Button>
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => {
                try {
                  localStorage.removeItem("fabrixa:parts-v2");
                  localStorage.removeItem(PREFS_KEY);
                  toast.success("Local drafts cleared");
                } catch {
                  toast.error("Could not clear storage");
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear local design cache
            </Button>
            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Fabrixa Studio</p>
              <p className="mt-1">Built by Axiom Dynamics</p>
              <p className="mt-2 opacity-80">
                Cloud sync, subscriptions, and coin balances are stored securely
                in your account.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Crown;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3 text-primary" />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function PrefRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function loadPrefs(): {
  exportQuality: "web" | "print" | "hd";
  defaultGarmentId?: GarmentTypeId;
  sceneId?: ScenePresetId;
} {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as ReturnType<typeof loadPrefs>;
  } catch {
    /* ignore */
  }
  return { exportQuality: "web" };
}

function savePrefs(p: object) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function loadStoredPrefs() {
  return loadPrefs();
}
