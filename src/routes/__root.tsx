import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { getSupabase } from "@/lib/fabrixa/supabase";
import { initAuth } from "@/lib/fabrixa/authStore";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  console.error(error);

  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back
          home.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route =
  createRootRouteWithContext<{ queryClient: QueryClient }>()({
    head: () => ({
      meta: [
        {
          charSet: "utf-8",
        },

        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },

        {
          title:
            "Fabrixa | AI Textile Design Studio for Fabric & Garment Creation",
        },

        {
          name: "description",
          content:
            "Fabrixa is an AI-powered textile and garment design studio for creating fabric patterns, textile artworks, and realistic 3D garment previews online.",
        },

        {
          name: "keywords",
          content:
            "textile design, fabric design, garment design, AI textile studio, fashion design software, 3D garment preview, fabric pattern maker, textile CAD, fabric editor, textile software",
        },

        {
          name: "author",
          content: "Fabrixa",
        },

        {
          name: "robots",
          content: "index, follow",
        },

        {
          name: "theme-color",
          content: "#000000",
        },

        {
          property: "og:title",
          content:
            "Fabrixa | AI Textile Design Studio for Fabric & Garment Creation",
        },

        {
          property: "og:description",
          content:
            "Create textile patterns, design fabrics, and preview garments in realistic 3D using Fabrixa.",
        },

        {
          property: "og:type",
          content: "website",
        },

        {
          property: "og:url",
          content: "https://fabrixa.vercel.app",
        },

        {
          property: "og:image",
          content: "/logo.jpeg",
        },

        {
          property: "og:site_name",
          content: "Fabrixa",
        },

        {
          name: "twitter:card",
          content: "summary_large_image",
        },

        {
          name: "twitter:title",
          content:
            "Fabrixa | AI Textile Design Studio for Fabric & Garment Creation",
        },

        {
          name: "twitter:description",
          content:
            "Design fabrics, create textile patterns, and preview garments in 3D with Fabrixa.",
        },

        {
          name: "twitter:image",
          content: "/logo.jpeg",
        },
      ],

      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },

        {
          rel: "icon",
          type: "image/jpeg",
          href: "/logo.jpeg",
        },

        {
          rel: "canonical",
          href: "https://fabrixa.vercel.app",
        },

        {
          rel: "apple-touch-icon",
          href: "/logo.jpeg",
        },
      ],
    }),

    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  });

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>

      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    initAuth();

    const sb = getSupabase();

    const { data: sub } = sb.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") return;

        if (
          (event === "SIGNED_IN" ||
            event === "INITIAL_SESSION") &&
          session
        ) {
          if (window.location.hash.includes("access_token")) {
            history.replaceState(
              null,
              "",
              window.location.pathname +
                window.location.search
            );
          }
        }

        if (event === "SIGNED_OUT") {
          const path = window.location.pathname;

          if (
            path !== "/" &&
            path !== "/reset-password"
          ) {
            void router.navigate({ to: "/" });
          }
        }
      }
    );

    return () => sub.subscription.unsubscribe();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}