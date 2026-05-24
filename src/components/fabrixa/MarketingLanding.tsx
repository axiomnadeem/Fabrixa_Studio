import { Layers, Palette, Box, Wand2, Shield, Zap, Loader2, Sparkles } from "lucide-react";
import { AppHeader, AppFooter } from "@/components/fabrixa/AppChrome";
import { AuthForm } from "@/components/fabrixa/AuthDialog";
import { useAuth } from "@/lib/fabrixa/useAuth";

const FEATURES = [
  { icon: Palette, title: "2D textile editor", desc: "Patterns, gradients, and production-ready exports." },
  { icon: Box, title: "Live 3D garments", desc: "Real meshes for kurtis, gowns, shirts, and more." },
  { icon: Wand2, title: "AI studio", desc: "Tiered daily AI with coin-based usage." },
  { icon: Layers, title: "Cloud projects", desc: "Save and resume designs securely." },
  { icon: Shield, title: "Subscription tiers", desc: "Creator, Studio, and Enterprise plans." },
  { icon: Zap, title: "HD & showroom", desc: "4K renders and showroom unlocks when you need them." },
];

const SLOGANS = [
  "From sketch to showroom in one flow.",
  "Patterns that drape — not just sit.",
  "Built for designers who ship.",
];

export function MarketingLanding() {
  const { user, loading } = useAuth();

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,hsl(var(--primary)/0.18),transparent_55%),radial-gradient(ellipse_70%_50%_at_90%_20%,hsl(var(--primary)/0.12),transparent_50%),linear-gradient(to_b,hsl(var(--background)),hsl(var(--muted)/0.35))]" />
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-primary/8 blur-3xl" />

      <AppHeader minimal />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* Left — slogan & value */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-primary shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <Sparkles className="h-3.5 w-3.5" />
              Professional textile studio
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Design fabrics.
                <span className="mt-2 block bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
                  Wear them in 3D.
                </span>
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
                Fabrixa unites a premium 2D canvas with real garment meshes — so your
                team sees drape, color, and repeat before a single sample is cut.
              </p>
            </div>

            <ul className="space-y-3 border-l-2 border-primary/30 pl-4">
              {SLOGANS.map((line) => (
                <li key={line} className="text-sm font-medium text-foreground/85">
                  {line}
                </li>
              ))}
            </ul>

            <p className="text-xs text-muted-foreground">
              by <span className="font-medium text-foreground/70">Axiom Dynamics</span>
            </p>
          </div>

          {/* Right — glass auth card */}
          <div className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-primary/30 via-transparent to-primary/10 opacity-60 blur-xl" />
            <div className="relative rounded-3xl border border-white/25 bg-white/40 p-1 shadow-2xl shadow-primary/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
              <div className="rounded-[1.35rem] border border-white/30 bg-background/75 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-background/60 sm:p-8">
                {loading || user ? (
                  <div className="flex h-80 flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Preparing your studio…</p>
                  </div>
                ) : (
                  <AuthForm variant="glass" />
                )}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/20 bg-white/30 p-5 shadow-sm backdrop-blur-md transition hover:border-primary/30 hover:bg-white/40 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <f.icon className="mb-3 h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <AppFooter className="relative z-10 bg-transparent" />
    </div>
  );
}
