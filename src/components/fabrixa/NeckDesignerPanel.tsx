// NeckDesignerPanel — curated neckline templates + AI-generated necklines.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Coins, Scissors } from "lucide-react";
import { toast } from "sonner";
import { generateImage, isAiConfigured } from "@/lib/fabrixa/ai";
import { costOfFeature, useEntitlements } from "@/lib/fabrixa/entitlements";
import { useRunGated } from "@/lib/fabrixa/runGated";
import type { GarmentType } from "@/lib/fabrixa/garments";

interface Props {
  garment: GarmentType;
  balance: number;
  onApply: (dataUrl: string, partId: string, meta: { prompt: string; model: string }) => void;
}

const NECK_PRESETS = [
  { id: "boat", label: "Boat", prompt: "Embroidered boat neckline trim, gold thread on red silk, repeating motif, ornate Indian textile, top-down" },
  { id: "v", label: "V-Neck", prompt: "V-neck embroidery border, intricate paisley, deep maroon with gold zari, traditional Indian" },
  { id: "round", label: "Round", prompt: "Round neckline mirror-work embroidery, multicolor threads on ivory, festive Indian wear" },
  { id: "square", label: "Square", prompt: "Square neckline geometric block print border, indigo on cream, hand-drawn" },
  { id: "halter", label: "Halter", prompt: "Halter neck ornate floral embroidery, pastel pink and silver, delicate beadwork" },
  { id: "keyhole", label: "Keyhole", prompt: "Keyhole neckline gold trim with small jewels, royal blue background, photorealistic" },
];

function findNeckPart(g: GarmentType): string | null {
  for (const p of g.parts) {
    const id = p.id.toLowerCase();
    if (id.includes("neck") || id === "collar" || id === "lapel" || id === "placket") return p.id;
  }
  return null;
}

export function NeckDesignerPanel({ garment, balance, onApply }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const runGated = useRunGated();
  const { data: ent } = useEntitlements();
  const cost = costOfFeature("AI_GENERATION");
  const coins = ent?.coinBalance ?? balance;
  const partId = findNeckPart(garment);
  const configured = isAiConfigured();

  if (!partId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        This garment has no neckline / collar part to design.
      </div>
    );
  }

  const run = async (prompt: string, id: string) => {
    if (!configured) {
      toast.error("Set Google AI Studio key in APP_DATA_0.json");
      return;
    }
    setBusyId(id);
    try {
      await runGated("AI_GENERATION", async () => {
        const r = await generateImage({ prompt, task: "neckDesign" });
        onApply(r.dataUrl, partId, { prompt, model: r.model });
        toast.success(`Neckline applied to ${garment.label}`);
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3">
      <div className="flex items-center gap-2">
        <Scissors className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Neck Designer</h2>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border bg-panel px-2 py-0.5 text-xs">
          <Coins className="h-3 w-3" /> {coins} · {cost}/design
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Designs apply to <strong>{garment.parts.find((p) => p.id === partId)?.label}</strong>.
        Uses AI daily cap + coin balance from your plan.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {NECK_PRESETS.map((np) => (
          <Button
            key={np.id}
            variant="outline"
            className="h-auto flex-col gap-1 py-3 text-xs"
            disabled={!!busyId}
            onClick={() => void run(np.prompt, np.id)}
          >
            {busyId === np.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {np.label}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border bg-panel/80 p-3">
        <Label className="text-xs uppercase text-muted-foreground">Custom prompt</Label>
        <Textarea value={custom} onChange={(e) => setCustom(e.target.value)} rows={3} className="mt-1.5" />
        <Button
          className="mt-2 w-full"
          disabled={!!busyId || !custom.trim()}
          onClick={() => void run(custom, "custom")}
        >
          {busyId === "custom" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate custom ({cost} coins)
        </Button>
      </div>
    </div>
  );
}
