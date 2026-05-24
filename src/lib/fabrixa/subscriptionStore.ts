// Zustand subscription store — single source of truth for tier, coins,
// AI pack, daily allowance, showroom downloads, and expiry. Persisted to
// localStorage; when a Firebase user is signed in the store mirrors itself
// to users/{uid}/subscription/state via cloudSync.ts (best-effort).
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { APP_DATA_0, type SubscriptionTierId, type CoinAction } from "@/lib/fabrixa/APP_DATA_0";

const dayMs = 24 * 60 * 60 * 1000;
const now = () => Date.now();

export interface SubscriptionState {
  // identity
  uid: string | null;
  adminMode: boolean;

  // tier
  subscriptionTier: SubscriptionTierId | null;
  basePlanExpiry: number | null; // ms epoch

  // coins
  coinBalance: number;
  dailyAllowance: number;
  lastDailyResetAt: number;

  // saves & showroom
  dailyShowroomDownloadsCount: number;
  unlockedShowroomDesigns: string[];

  // AI pack
  hasAiPack: boolean;
  aiPackExpiry: number | null;
  dailyAiRequestsRemaining: number;

  // ---- actions ----
  setUid: (uid: string | null) => void;
  setAdminMode: (on: boolean) => void;
  isExpired: () => boolean;
  isAiPackActive: () => boolean;
  canAfford: (action: CoinAction, qty?: number) => boolean;
  costOf: (action: CoinAction) => number;
  spend: (action: CoinAction, qty?: number) => { ok: boolean; reason?: string };
  registerSave: () => { ok: boolean; reason?: string };
  registerShowroomDownload: (designId: string) => { ok: boolean; reason?: string };
  applyDailyResetIfNeeded: () => void;
  activateTier: (tier: SubscriptionTierId, opts?: { durationDays?: number }) => void;
  activateAiPack: () => void;
  resetAll: () => void;
  clearPlanState: () => void;
  hydrateFromUserDoc: (doc: Partial<{
    subscriptionTier: SubscriptionTierId | null;
    basePlanExpiry: number | null;
    coinBalance: number;
    dailyAllowance: number;
    lastDailyResetAt: number;
    hasAiPack: boolean;
    aiPackExpiry: number | null;
    dailyAiRequestsRemaining: number;
    dailyShowroomDownloadsCount: number;
    unlockedShowroomDesigns: string[];
  }>) => void;
}

const INITIAL: Omit<SubscriptionState,
  | "setUid" | "setAdminMode" | "isExpired" | "isAiPackActive"
  | "canAfford" | "costOf" | "spend" | "registerSave"
  | "registerShowroomDownload" | "applyDailyResetIfNeeded"
  | "activateTier" | "activateAiPack" | "resetAll" | "clearPlanState" | "hydrateFromUserDoc"
> = {
  uid: null,
  adminMode: false,
  subscriptionTier: null,
  basePlanExpiry: null,
  coinBalance: 0,
  dailyAllowance: 0,
  lastDailyResetAt: 0,
  dailyShowroomDownloadsCount: 0,
  unlockedShowroomDesigns: [],
  hasAiPack: false,
  aiPackExpiry: null,
  dailyAiRequestsRemaining: 0,
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      setUid: (uid) => set({ uid }),
      setAdminMode: (on) => set({ adminMode: on }),

      isExpired: () => {
        const s = get();
        if (s.adminMode) return false;
        if (!s.subscriptionTier || !s.basePlanExpiry) return true;
        return now() > s.basePlanExpiry;
      },

      isAiPackActive: () => {
        const s = get();
        if (s.adminMode) return true;
        // Bundled with Studio/Production
        const tier = s.subscriptionTier ? APP_DATA_0.tiers[s.subscriptionTier] : null;
        if (tier?.aiIncluded && s.basePlanExpiry && now() <= s.basePlanExpiry) return true;
        if (!s.hasAiPack || !s.aiPackExpiry) return false;
        if (now() > s.aiPackExpiry) return false;
        // AI pack inactive if base plan expired
        if (!s.basePlanExpiry || now() > s.basePlanExpiry) return false;
        return true;
      },

      costOf: (action) => APP_DATA_0.coinCosts[action] ?? 0,

      canAfford: (action, qty = 1) => {
        const s = get();
        if (s.adminMode) return true;
        const cost = (APP_DATA_0.coinCosts[action] ?? 0) * qty;
        // AI: use AI pack quota first
        if (action === "aiGeneration") {
          if (s.isAiPackActive() && s.dailyAiRequestsRemaining >= qty) return true;
        }
        return s.coinBalance >= cost;
      },

      spend: (action, qty = 1) => {
        const s = get();
        if (s.adminMode) return { ok: true };
        if (s.isExpired()) return { ok: false, reason: "Subscription expired" };

        // AI uses pack first
        if (action === "aiGeneration") {
          if (s.isAiPackActive() && s.dailyAiRequestsRemaining >= qty) {
            set({ dailyAiRequestsRemaining: s.dailyAiRequestsRemaining - qty });
            return { ok: true };
          }
          // tier without AI cannot fall back to coins on starter
          const tier = s.subscriptionTier ? APP_DATA_0.tiers[s.subscriptionTier] : null;
          if (tier && !tier.aiIncluded && !s.hasAiPack) {
            return { ok: false, reason: "AI is locked on your tier — upgrade or add AI Pack" };
          }
        }
        const cost = (APP_DATA_0.coinCosts[action] ?? 0) * qty;
        if (s.coinBalance < cost) return { ok: false, reason: "Not enough coins" };
        set({ coinBalance: s.coinBalance - cost });
        return { ok: true };
      },

      registerSave: () => {
        // Save-count tracking removed: not part of the strict 3-table schema.
        // Per-tier maxSaves is enforced by counting documents in the
        // `projects` collection at call time, not from local state.
        const s = get();
        if (s.adminMode) return { ok: true };
        if (s.isExpired()) return { ok: false, reason: "Subscription expired" };
        return { ok: true };
      },

      registerShowroomDownload: (designId) => {
        const s = get();
        if (s.adminMode) {
          if (!s.unlockedShowroomDesigns.includes(designId)) {
            set({ unlockedShowroomDesigns: [...s.unlockedShowroomDesigns, designId] });
          }
          return { ok: true };
        }
        if (s.isExpired()) return { ok: false, reason: "Subscription expired" };
        const tier = s.subscriptionTier ? APP_DATA_0.tiers[s.subscriptionTier] : null;
        if (!tier) return { ok: false, reason: "No active subscription" };
        if (s.dailyShowroomDownloadsCount >= tier.maxShowroomDownloadsPerDay) {
          return { ok: false, reason: `Daily showroom download limit reached (${tier.maxShowroomDownloadsPerDay})` };
        }
        const cost = APP_DATA_0.coinCosts.showroomDownload;
        if (s.coinBalance < cost) return { ok: false, reason: "Not enough coins" };
        set({
          coinBalance: s.coinBalance - cost,
          dailyShowroomDownloadsCount: s.dailyShowroomDownloadsCount + 1,
          unlockedShowroomDesigns: s.unlockedShowroomDesigns.includes(designId)
            ? s.unlockedShowroomDesigns
            : [...s.unlockedShowroomDesigns, designId],
        });
        return { ok: true };
      },

      applyDailyResetIfNeeded: () => {
        const s = get();
        if (s.adminMode) return;
        if (!s.subscriptionTier || !s.basePlanExpiry) return;
        if (now() > s.basePlanExpiry) return;
        if (now() - s.lastDailyResetAt < dayMs) return;
        const tier = APP_DATA_0.tiers[s.subscriptionTier];
        set({
          coinBalance: tier.dailyAllowance,
          dailyAllowance: tier.dailyAllowance,
          dailyShowroomDownloadsCount: 0,
          dailyAiRequestsRemaining: tier.aiIncluded || s.hasAiPack ? APP_DATA_0.aiPack.dailyRequests : 0,
          lastDailyResetAt: now(),
        });
      },

      activateTier: (tierId, opts) => {
        const tier = APP_DATA_0.tiers[tierId];
        const durationDays = opts?.durationDays ?? 30;
        set({
          subscriptionTier: tierId,
          basePlanExpiry: now() + durationDays * dayMs,
          coinBalance: tier.dailyAllowance,
          dailyAllowance: tier.dailyAllowance,
          lastDailyResetAt: now(),
          dailyShowroomDownloadsCount: 0,
          dailyAiRequestsRemaining: tier.aiIncluded ? APP_DATA_0.aiPack.dailyRequests : 0,
        });
      },

      activateAiPack: () => {
        set({
          hasAiPack: true,
          aiPackExpiry: now() + APP_DATA_0.aiPack.durationDays * dayMs,
          dailyAiRequestsRemaining: APP_DATA_0.aiPack.dailyRequests,
        });
      },

      resetAll: () => set({ ...INITIAL }),

      clearPlanState: () =>
        set({
          subscriptionTier: null,
          basePlanExpiry: null,
          coinBalance: 0,
          dailyAllowance: 0,
          lastDailyResetAt: 0,
          dailyShowroomDownloadsCount: 0,
          unlockedShowroomDesigns: [],
          hasAiPack: false,
          aiPackExpiry: null,
          dailyAiRequestsRemaining: 0,
          adminMode: false,
        }),

      hydrateFromUserDoc: (data) => {
        // Replace local subscription fields with values from users/{uid}.
        // Only the schema-allowed fields are applied.
        set({
          subscriptionTier: data.subscriptionTier ?? null,
          basePlanExpiry: data.basePlanExpiry ?? null,
          coinBalance: data.coinBalance ?? 0,
          dailyAllowance: data.dailyAllowance ?? 0,
          lastDailyResetAt: data.lastDailyResetAt ?? 0,
          hasAiPack: data.hasAiPack ?? false,
          aiPackExpiry: data.aiPackExpiry ?? null,
          dailyAiRequestsRemaining: data.dailyAiRequestsRemaining ?? 0,
          dailyShowroomDownloadsCount: data.dailyShowroomDownloadsCount ?? 0,
          unlockedShowroomDesigns: data.unlockedShowroomDesigns ?? [],
        });
      },
    }),
    {
      name: "fabrixa:subscription",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage),
      ),
      partialize: (s) => ({
        uid: s.uid,
        adminMode: s.adminMode,
        subscriptionTier: s.subscriptionTier,
        basePlanExpiry: s.basePlanExpiry,
        coinBalance: s.coinBalance,
        dailyAllowance: s.dailyAllowance,
        lastDailyResetAt: s.lastDailyResetAt,
        dailyShowroomDownloadsCount: s.dailyShowroomDownloadsCount,
        unlockedShowroomDesigns: s.unlockedShowroomDesigns,
        hasAiPack: s.hasAiPack,
        aiPackExpiry: s.aiPackExpiry,
        dailyAiRequestsRemaining: s.dailyAiRequestsRemaining,
      }),
    },
  ),
);

// ---- Tier permission helpers ----
export function isModelAllowed(modelId: string): boolean {
  const s = useSubscriptionStore.getState();
  if (s.adminMode) return true;
  const tier = s.subscriptionTier ? APP_DATA_0.tiers[s.subscriptionTier] : null;
  if (!tier) return false;
  if (tier.allowedModels === "ALL") return true;
  return (tier.allowedModels as readonly string[]).includes(modelId.toLowerCase());
}

export function isMaterialAllowed(materialId: string): boolean {
  const s = useSubscriptionStore.getState();
  if (s.adminMode) return true;
  const tier = s.subscriptionTier ? APP_DATA_0.tiers[s.subscriptionTier] : null;
  if (!tier) return false;
  if (tier.allowedMaterials === "ALL") return true;
  return (tier.allowedMaterials as readonly string[]).includes(materialId.toLowerCase());
}

export function isBackgroundAllowed(bgId: string): boolean {
  const s = useSubscriptionStore.getState();
  if (s.adminMode) return true;
  const tier = s.subscriptionTier ? APP_DATA_0.tiers[s.subscriptionTier] : null;
  if (!tier) return false;
  if (tier.allowedBackgrounds === "ALL") return true;
  return (tier.allowedBackgrounds as readonly string[]).includes(bgId.toLowerCase());
}

