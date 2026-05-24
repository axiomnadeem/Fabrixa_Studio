// Per-user credit ledger.
// - Local-first: works offline via localStorage.
// - When signed in, syncs to Firestore at users/{uid}/credits/ledger.
// - Tracks lifetime totals + today's counts for: exports, aiDesigns, renders3d.
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { APP_DATA_0 } from "@/lib/fabrixa/APP_DATA_0";

export type CreditAction = keyof typeof APP_DATA_0.credits.costs;

export interface CreditLedger {
  balance: number;
  lastGrantDay: string; // YYYY-MM-DD
  totals: { exports: number; aiDesigns: number; renders3d: number };
  today: { day: string; exports: number; aiDesigns: number; renders3d: number };
  updatedAt?: unknown;
}

const LS_KEY = "fabrixa:credits";
const today = () => new Date().toISOString().slice(0, 10);

export function emptyLedger(): CreditLedger {
  return {
    balance: APP_DATA_0.credits.startingBalance,
    lastGrantDay: "",
    totals: { exports: 0, aiDesigns: 0, renders3d: 0 },
    today: { day: today(), exports: 0, aiDesigns: 0, renders3d: 0 },
  };
}

function readLocal(): CreditLedger {
  if (typeof window === "undefined") return emptyLedger();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return emptyLedger();
    const parsed = JSON.parse(raw) as CreditLedger;
    // roll over daily counts
    if (parsed.today?.day !== today()) {
      parsed.today = { day: today(), exports: 0, aiDesigns: 0, renders3d: 0 };
    }
    return { ...emptyLedger(), ...parsed };
  } catch {
    return emptyLedger();
  }
}

function writeLocal(l: CreditLedger) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(l)); } catch { /* ignore */ }
}

export async function loadLedger(uid: string | null): Promise<CreditLedger> {
  const local = readLocal();
  if (!uid) return grantDailyIfNeeded(local);
  try {
    const ref = doc(getDb(), "users", uid, "credits", "ledger");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const remote = snap.data() as CreditLedger;
      // roll-over today
      if (remote.today?.day !== today()) {
        remote.today = { day: today(), exports: 0, aiDesigns: 0, renders3d: 0 };
      }
      const merged = grantDailyIfNeeded({ ...emptyLedger(), ...remote });
      writeLocal(merged);
      return merged;
    }
    const fresh = grantDailyIfNeeded(local);
    await setDoc(ref, { ...fresh, updatedAt: serverTimestamp() });
    return fresh;
  } catch {
    return grantDailyIfNeeded(local);
  }
}

export async function saveLedger(uid: string | null, l: CreditLedger): Promise<void> {
  writeLocal(l);
  if (!uid) return;
  try {
    const ref = doc(getDb(), "users", uid, "credits", "ledger");
    await setDoc(ref, { ...l, updatedAt: serverTimestamp() }, { merge: true });
  } catch { /* ignore */ }
}

function grantDailyIfNeeded(l: CreditLedger): CreditLedger {
  const d = today();
  if (l.lastGrantDay !== d) {
    return { ...l, lastGrantDay: d, balance: l.balance + APP_DATA_0.credits.dailyFreeGrant };
  }
  return l;
}

export function costOf(action: CreditAction): number {
  return APP_DATA_0.credits.costs[action] ?? 0;
}

/** Per-garment-type 3D render cost (falls back to costs.render3d). */
export function costOfRender3dType(typeId: string): number {
  const map = APP_DATA_0.credits.render3dByType as Record<string, number>;
  return map?.[typeId] ?? APP_DATA_0.credits.costs.render3d;
}

export function canAfford(l: CreditLedger, action: CreditAction): boolean {
  return l.balance >= costOf(action);
}

export function canAffordAmount(l: CreditLedger, amount: number): boolean {
  return l.balance >= amount;
}

/** Spend a variable amount and bump the counter for an action. */
export function spendAmount(
  l: CreditLedger, action: CreditAction, amount: number,
): CreditLedger {
  const next: CreditLedger = {
    ...l,
    balance: Math.max(0, l.balance - amount),
    totals: { ...l.totals },
    today: { ...l.today, day: today() },
  };
  if (action === "export") { next.totals.exports++; next.today.exports++; }
  if (action === "aiImageGen" || action === "aiImageEdit" || action === "aiNeckDesign") {
    next.totals.aiDesigns++; next.today.aiDesigns++;
  }
  if (action === "render3d") { next.totals.renders3d++; next.today.renders3d++; }
  return next;
}

/** Spend credits and bump the counters for an action. Returns the new ledger. */
export function spend(l: CreditLedger, action: CreditAction): CreditLedger {
  const cost = costOf(action);
  const next: CreditLedger = {
    ...l,
    balance: Math.max(0, l.balance - cost),
    totals: { ...l.totals },
    today: { ...l.today, day: today() },
  };
  if (action === "export") { next.totals.exports++; next.today.exports++; }
  if (action === "aiImageGen" || action === "aiImageEdit" || action === "aiNeckDesign") {
    next.totals.aiDesigns++; next.today.aiDesigns++;
  }
  if (action === "render3d") { next.totals.renders3d++; next.today.renders3d++; }
  return next;
}
