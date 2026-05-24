/** App origin for Supabase OAuth / email links — always the current host, never a Lovable sandbox URL. */
export function getAppOrigin(): string {
  if (typeof window === "undefined") return "";
  const { origin, hostname } = window.location;
  if (/lovable\.(app|dev|project)/i.test(hostname)) {
    console.warn(
      "[Fabrixa] Running on a Lovable host. Add this URL to Supabase Auth → Redirect URLs, or run locally (npm run dev).",
    );
  }
  return origin.replace(/\/$/, "");
}

export function authCallbackUrl(): string {
  const o = getAppOrigin();
  return o ? `${o}/auth/callback` : "/auth/callback";
}

export function resetPasswordUrl(): string {
  const o = getAppOrigin();
  return o ? `${o}/reset-password` : "/reset-password";
}
