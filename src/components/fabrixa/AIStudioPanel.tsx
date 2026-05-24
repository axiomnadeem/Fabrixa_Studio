// AIStudioPanel — text-to-pattern + multi-file image upload.
// All paid actions flow through useRunGated() so subscription tier,
// coin balance, daily caps, and the spend_feature RPC fire in order.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Upload, AlertTriangle, Coins } from "lucide-react";
import { toast } from "sonner";
import { generateImage, isAiConfigured } from "@/lib/fabrixa/ai";
import { useRunGated } from "@/lib/fabrixa/runGated";
import {
  aiDailyCapFor,
  costOfFeature,
  useEntitlements,
} from "@/lib/fabrixa/entitlements";

interface Props {
  /** Called with a data URL when an AI image is generated/uploaded. */
  onResult: (dataUrl: string, meta: { task: "imageGen" | "neckDesign"; prompt: string; model: string }) => void;
  /** Legacy local credit balance — display only. */
  balance: number;
}

const PROMPT_HINTS = [
  "Seamless paisley pattern, navy and gold, ornate Indian textile, vector",
  "Soft watercolor floral, blush pink and sage green, repeating tile",
  "Bold geometric block-print, terracotta on cream, hand-drawn",
  "Modern minimal stripes, charcoal and ivory, fabric tile, 4K",
];

export function AIStudioPanel({ onResult, balance }: Props) {
  const [prompt, setPrompt] = useState(PROMPT_HINTS[0]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const configured = isAiConfigured();
  const runGated = useRunGated();
  const { data: ent } = useEntitlements();

  const aiCost = costOfFeature("AI_GENERATION");
  const uploadCost = costOfFeature("IMAGE_UPLOAD");
  const coins = ent?.coinBalance ?? balance;
  const aiLeft = ent?.dailyAiRequestsRemaining ?? 0;
  const aiCap = ent ? aiDailyCapFor(ent.subscriptionTier) : 0;

  const generateAi = async () => {
    if (!configured) {
      toast.error("AI key missing in APP_DATA_0");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Add a prompt");
      return;
    }
    setBusy(true);
    try {
      await runGated("AI_GENERATION", async () => {
        const r = await generateImage({ prompt, task: "imageGen" });
        onResult(r.dataUrl, { task: "imageGen", prompt, model: r.model });
        toast.success("AI design generated");
      });
    } finally {
      setBusy(false);
    }
  };

  const uploadOne = (file: File) =>
    new Promise<void>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        try {
          onResult(r.result as string, {
            task: "imageGen",
            prompt: `upload:${file.name}`,
            model: "upload",
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      r.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      r.readAsDataURL(file);
    });

  // Multi-file batch upload — gated per file. If a single file fails the
  // gate (e.g. ran out of coins mid-batch), break the loop, surface a toast,
  // and keep the files that already succeeded.
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    let okCount = 0;
    try {
      for (const file of files) {
        const res = await runGated("IMAGE_UPLOAD", () => uploadOne(file));
        if (res === null) {
          toast.error(
            `Upload stopped at "${file.name}" — ${okCount} of ${files.length} uploaded.`,
          );
          break;
        }
        okCount++;
      }
      if (okCount === files.length) {
        toast.success(`Uploaded ${okCount} file${okCount === 1 ? "" : "s"}`);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">AI Design Studio</h2>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border bg-panel px-2 py-0.5 text-xs">
          <Coins className="h-3 w-3" /> {coins} coins · {aiCost}/gen
        </span>
      </div>

      {!configured && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-500/5 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
          <div>
            Set <code className="rounded bg-muted px-1">ai.apiKey</code> in <code className="rounded bg-muted px-1">APP_DATA_0.json</code> (Google AI Studio). Uploads still work without a key.
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-panel/80 p-3">
        <Label className="text-xs uppercase text-muted-foreground">Prompt</Label>
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="mt-1.5" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PROMPT_HINTS.map((p) => (
            <button key={p} onClick={() => setPrompt(p)}
              className="rounded-full border bg-background px-2.5 py-1 text-[11px] hover:bg-muted">
              {p.slice(0, 36)}…
            </button>
          ))}
        </div>
        <Button onClick={generateAi} disabled={busy || !configured} className="mt-3 w-full">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate ({aiCost} coins)
        </Button>
      </div>

      <div className="rounded-xl border bg-panel/80 p-3">
        <Label className="text-xs uppercase text-muted-foreground">
          Upload patterns ({uploadCost} coins per file)
        </Label>
        <div className="mt-2">
          <Input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={onUpload}
            className="cursor-pointer"
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          <Upload className="mr-1 inline h-3 w-3" />
          Select multiple files at once — each is processed and charged individually.
        </p>
      </div>
    </div>
  );
}
