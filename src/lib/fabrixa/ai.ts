// AI image generation — Google AI Studio (Gemini) via /api/ai/generate, OpenAI fallback.
import { APP_DATA_0 } from "@/lib/fabrixa/APP_DATA_0";

export interface GenerateOpts {
  prompt: string;
  size?: "512x512" | "1024x1024";
  task?: "imageGen" | "neckDesign" | "textToPattern";
}

export interface GenerateResult {
  dataUrl: string;
  provider: string;
  model: string;
}

export function isAiConfigured(): boolean {
  const k = APP_DATA_0.ai.apiKey;
  return !!k && !k.startsWith("REPLACE_ME") && !/DUMMY/i.test(k);
}

function demoImageFromPrompt(prompt: string): string {
  const size = 1024;
  const c = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!c) return "";
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  let h = 0;
  for (let i = 0; i < prompt.length; i++) h = (h * 31 + prompt.charCodeAt(i)) >>> 0;
  const h1 = h % 360;
  const h2 = (h1 + 140) % 360;
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, `hsl(${h1} 70% 55%)`);
  g.addColorStop(1, `hsl(${h2} 70% 45%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let y = 32; y < size; y += 64) {
    for (let x = 32; x < size; x += 64) {
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.fillText("DEMO · " + prompt.slice(0, 48), 24, size - 32);
  return c.toDataURL("image/png");
}

async function generateViaGeminiApi(
  prompt: string,
  task: string,
): Promise<GenerateResult> {
  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, task }),
  });
  const json = (await res.json()) as {
    dataUrl?: string;
    provider?: string;
    model?: string;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error ?? `AI failed (${res.status})`);
  if (!json.dataUrl) throw new Error("AI returned no image");
  return {
    dataUrl: json.dataUrl,
    provider: json.provider ?? "gemini",
    model: json.model ?? APP_DATA_0.ai.models.imageGen,
  };
}

export async function generateImage(opts: GenerateOpts): Promise<GenerateResult> {
  const task = opts.task ?? "imageGen";
  const model = APP_DATA_0.ai.models[task];
  const size = opts.size ?? "1024x1024";
  const key = APP_DATA_0.ai.apiKey;
  const isDummy = !key || key.startsWith("REPLACE_ME") || /DUMMY/i.test(key);

  if (isDummy) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      dataUrl: demoImageFromPrompt(opts.prompt),
      provider: "demo",
      model: "demo-swatch",
    };
  }

  if (APP_DATA_0.ai.provider === "gemini") {
    return generateViaGeminiApi(opts.prompt, task);
  }

  if (APP_DATA_0.ai.provider === "openai") {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), APP_DATA_0.ai.timeoutMs);
    try {
      const res = await fetch(`${APP_DATA_0.ai.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${APP_DATA_0.ai.apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: opts.prompt,
          n: 1,
          size,
          response_format: "b64_json",
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`AI failed (${res.status}): ${t.slice(0, 240)}`);
      }
      const json = (await res.json()) as {
        data?: Array<{ b64_json?: string; url?: string }>;
      };
      const first = json.data?.[0];
      if (first?.b64_json) {
        return {
          dataUrl: `data:image/png;base64,${first.b64_json}`,
          provider: "openai",
          model,
        };
      }
      if (first?.url) {
        const blob = await (await fetch(first.url)).blob();
        return {
          dataUrl: await blobToDataUrl(blob),
          provider: "openai",
          model,
        };
      }
      throw new Error("AI returned no image.");
    } finally {
      clearTimeout(tm);
    }
  }

  throw new Error(`Provider not implemented: ${APP_DATA_0.ai.provider}`);
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}
