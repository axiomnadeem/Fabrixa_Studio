import { createFileRoute } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { FabrixaApp } from "@/components/fabrixa/FabrixaApp";
import { AuthGate } from "@/components/fabrixa/AuthGate";
import { SubscriptionRequiredDialog } from "@/components/fabrixa/SubscriptionRequiredDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fabrixa — A Complete Textile Studio" },
      { name: "description", content: "Design fabrics in 2D, preview garments in 3D. Patterns, textures, repeats, HD exports — built for non-technical designers." },
      { property: "og:title", content: "Fabrixa — Textile & Garment Design Studio" },
      { property: "og:description", content: "2D textile designer with live 3D garment preview." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthGate>
        <FabrixaApp />
      </AuthGate>
      <SubscriptionRequiredDialog />
      <Toaster richColors position="bottom-right" />
    </ThemeProvider>
  );
}
