// POST /api/ai/generate — Google AI Studio (Gemini) image generation (server-side key).
import { createFileRoute } from "@tanstack/react-router";
import rootConfig from "../../../../APP_DATA_0.json";

type AiCfg = {
  provider: string;
  apiKey: string;
  baseUrl: string;
  imageModel?: string;
};

const cfg = (rootConfig as { ai: AiCfg }).ai;

export const Route = createFileRoute("/api/ai/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            prompt?: string;
            task?: string;
          };
          const prompt = body.prompt?.trim();
          if (!prompt) {
            return Response.json({ error: "prompt required" }, { status: 400 });
          }

          const key =
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_AI_API_KEY ||
            cfg.apiKey;
          if (!key || key.startsWith("REPLACE_ME")) {
            return Response.json(
              { error: "Set GEMINI_API_KEY or APP_DATA_0.ai.apiKey" },
              { status: 503 },
            );
          }

          const model =
            cfg.imageModel ?? "gemini-2.0-flash-preview-image-generation";
          const base = (cfg.baseUrl ?? "").replace(/\/$/, "");
          const url = `${base}/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `Generate a seamless square textile / fabric pattern image. ${prompt}. No text, no watermark, flat tileable design.`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ["TEXT", "IMAGE"],
              },
            }),
          });

          if (!res.ok) {
            const t = await res.text().catch(() => "");
            return Response.json(
              { error: `Gemini error ${res.status}: ${t.slice(0, 400)}` },
              { status: 502 },
            );
          }

          const json = (await res.json()) as {
            candidates?: Array<{
              content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
            }>;
          };

          const parts = json.candidates?.[0]?.content?.parts ?? [];
          const imgPart = parts.find((p) => p.inlineData?.data);
          if (!imgPart?.inlineData?.data) {
            return Response.json(
              { error: "Gemini returned no image — try another prompt or model." },
              { status: 502 },
            );
          }

          const mime = imgPart.inlineData.mimeType ?? "image/png";
          const dataUrl = `data:${mime};base64,${imgPart.inlineData.data}`;

          return Response.json({
            dataUrl,
            provider: "gemini",
            model,
          });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "AI failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
