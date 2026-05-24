// Shared auth state — single subscription for session restore, OAuth
// hash parsing, and all useAuth() consumers (AuthGate, FabrixaApp, etc.).
import type { Session, User as SbUser } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import { ensureUserProfile } from "./userProfile";

export interface FabrixaUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export function toFabrixaUser(u: SbUser | null | undefined): FabrixaUser | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
  return {
    uid: u.id,
    email: u.email ?? null,
    displayName: meta.full_name ?? meta.name ?? null,
    photoURL: meta.avatar_url ?? meta.picture ?? null,
  };
}

type State = { user: FabrixaUser | null; loading: boolean };

let state: State = { user: null, loading: true };
const listeners = new Set<(s: State) => void>();
let initialized = false;

function emit() {
  for (const l of listeners) l(state);
}

function setState(next: Partial<State>) {
  state = { ...state, ...next };
  emit();
}

export function getAuthState(): State {
  return state;
}

export function subscribeAuth(listener: (s: State) => void): () => void {
  listeners.add(listener);
  ensureInit();
  return () => {
    listeners.delete(listener);
  };
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const sb = getSupabase();

  const syncProfile = (session: Session | null) => {
    const u = session?.user;
    if (u) void ensureUserProfile(u.id, u.email ?? null);
  };

  sb.auth.getSession().then(({ data }) => {
    setState({ user: toFabrixaUser(data.session?.user ?? null), loading: false });
    syncProfile(data.session);
  });

  sb.auth.onAuthStateChange((event, session: Session | null) => {
    setState({ user: toFabrixaUser(session?.user ?? null), loading: false });
    if (
      session?.user &&
      (event === "SIGNED_IN" ||
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED")
    ) {
      syncProfile(session);
    }
  });
}

export function initAuth() {
  ensureInit();
}
