// =============================================================
// useUserDocSync — keeps the Zustand subscription store in sync with the
// flat `users/{uid}` document. On sign-in, hydrates the store from the
// remote doc (creating it if missing). On store changes, debounced-writes
// only the schema-allowed fields back to Firestore.
// =============================================================
import { useEffect, useRef } from "react";
import { useSubscriptionStore } from "@/lib/fabrixa/subscriptionStore";
import { loadUserDoc, saveUserDoc, type UserDoc } from "@/lib/fabrixa/cloudSave";

export function useUserDocSync(uid: string | null) {
  const hydrate = useSubscriptionStore((s) => s.hydrateFromUserDoc);
  const lastUidRef = useRef<string | null>(null);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1) Hydrate from users/{uid} once per uid.
  useEffect(() => {
    if (!uid) { lastUidRef.current = null; return; }
    if (lastUidRef.current === uid) return;
    lastUidRef.current = uid;
    let cancelled = false;
    (async () => {
      try {
        const remote = await loadUserDoc(uid);
        if (cancelled) return;
        if (remote) {
          hydrate(remote);
        } else {
          // First-time user: seed the doc from current local state.
          const s = useSubscriptionStore.getState();
          const seed: UserDoc = {
            id: uid,
            subscriptionTier: s.subscriptionTier,
            basePlanExpiry: s.basePlanExpiry,
            coinBalance: s.coinBalance,
            dailyAllowance: s.dailyAllowance,
            lastDailyResetAt: s.lastDailyResetAt,
            hasAiPack: s.hasAiPack,
            aiPackExpiry: s.aiPackExpiry,
            dailyAiRequestsRemaining: s.dailyAiRequestsRemaining,
            dailyShowroomDownloadsCount: s.dailyShowroomDownloadsCount,
            unlockedShowroomDesigns: s.unlockedShowroomDesigns,
          };
          await saveUserDoc(uid, seed);
        }
      } catch (e) { console.warn("[user-doc] hydrate failed", e); }
    })();
    return () => { cancelled = true; };
  }, [uid, hydrate]);

  // 2) Write-back: subscribe to store changes, debounce, mirror to users/{uid}.
  useEffect(() => {
    if (!uid) return;
    const unsub = useSubscriptionStore.subscribe((s) => {
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
      writeTimerRef.current = setTimeout(() => {
        const patch: Partial<UserDoc> = {
          subscriptionTier: s.subscriptionTier,
          basePlanExpiry: s.basePlanExpiry,
          coinBalance: s.coinBalance,
          dailyAllowance: s.dailyAllowance,
          lastDailyResetAt: s.lastDailyResetAt,
          hasAiPack: s.hasAiPack,
          aiPackExpiry: s.aiPackExpiry,
          dailyAiRequestsRemaining: s.dailyAiRequestsRemaining,
          dailyShowroomDownloadsCount: s.dailyShowroomDownloadsCount,
          unlockedShowroomDesigns: s.unlockedShowroomDesigns,
        };
        saveUserDoc(uid, patch).catch((e) => console.warn("[user-doc] write failed", e));
      }, 800);
    });
    return () => {
      unsub();
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    };
  }, [uid]);
}
