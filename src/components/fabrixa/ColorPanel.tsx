// Enhanced color panel — full HSV picker (react-colorful),
// hex/RGB/HSL numeric inputs, eyedropper (where supported),
// recent colors persisted in localStorage, plus a gradient builder.
// Used in the per-part editor of FabrixaApp.

import { useCallback, useEffect, useMemo, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, Paintbrush, Pipette } from "lucide-react";
import { gradientToDataUrl } from "@/lib/fabrixa/textureCache";

interface Props {
  color: string;
  onColorChange: (hex: string) => void;
  onApplyGradientTexture: (dataUrl: string) => void;
}

/* ------------ color math helpers ------------ */
function hexToRgb(hex: string) {
  const m = hex.replace("#", "").padEnd(6, "0");
  return {
    r: parseInt(m.slice(0, 2), 16),
    g: parseInt(m.slice(2, 4), 16),
    b: parseInt(m.slice(4, 6), 16),
  };
}
function rgbToHex(r: number, g: number, b: number) {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function hslToHex(h: number, s: number, l: number) {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return rgbToHex(v, v, v);
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return rgbToHex(
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  );
}

const RECENT_KEY = "fabrixa:recent-colors";
const CURATED = {
  Brand:  ["#7e3c8c", "#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9"],
  Earth:  ["#8b6f5e", "#c4a484", "#6b3a2a", "#4a6741", "#87a878", "#cd7f32"],
  Pastel: ["#fde2e4", "#cdeac0", "#b8e0d2", "#d6e2e9", "#fad2e1", "#e2ece9"],
  Neon:   ["#39ff14", "#ff6ec7", "#0ff0fc", "#fffa01", "#ff5e00", "#bc13fe"],
} as const;

function pushRecent(hex: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [hex, ...arr.filter((c) => c.toLowerCase() !== hex.toLowerCase())].slice(0, 12);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    return next;
  } catch { return []; }
}
function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

/* ------------ shared color picker block ------------
 * Exported so the 3D Selected-region editor can reuse the exact same
 * picker UX as the 2D part editor.
 * --------------------------------------------------- */
export function ColorPickerBlock({
  color,
  onColorChange,
  compact = false,
}: {
  color: string;
  onColorChange: (hex: string) => void;
  compact?: boolean;
}) {
  const [hexInput, setHexInput] = useState(color);
  const [recent, setRecent] = useState<string[]>(() => readRecent());
  useEffect(() => setHexInput(color), [color]);

  const rgb = useMemo(() => hexToRgb(color), [color]);
  const hsl = useMemo(() => rgbToHsl(rgb.r, rgb.g, rgb.b), [rgb]);

  const commit = useCallback((hex: string) => {
    onColorChange(hex);
    setRecent(pushRecent(hex));
  }, [onColorChange]);

  const onPipette = async () => {
    const W = window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } };
    if (!W.EyeDropper) return;
    try {
      const result = await new W.EyeDropper().open();
      if (result?.sRGBHex) commit(result.sRGBHex);
    } catch { /* user cancelled */ }
  };

  const hasEyeDropper =
    typeof window !== "undefined" &&
    !!(window as unknown as { EyeDropper?: unknown }).EyeDropper;

  return (
    <div className="space-y-2.5">
      <HexColorPicker
        color={color}
        onChange={commit}
        style={{ width: "100%", height: compact ? 140 : 180 }}
      />

      <div className="flex items-center gap-1.5">
        <div
          className="h-9 w-9 shrink-0 rounded-md border"
          style={{ background: color }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => {
            const v = e.target.value;
            setHexInput(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) commit(v);
          }}
          className="flex-1 rounded-md border bg-background px-2 py-1.5 font-mono text-xs uppercase"
          placeholder="#rrggbb"
        />
        {hasEyeDropper && (
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9"
            title="Pick a color from screen"
            onClick={onPipette}
          >
            <Pipette className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-2">
          <NumInput label="R" value={rgb.r} max={255}
            onChange={(v) => commit(rgbToHex(v, rgb.g, rgb.b))} />
          <NumInput label="G" value={rgb.g} max={255}
            onChange={(v) => commit(rgbToHex(rgb.r, v, rgb.b))} />
          <NumInput label="B" value={rgb.b} max={255}
            onChange={(v) => commit(rgbToHex(rgb.r, rgb.g, v))} />
          <NumInput label="H" value={hsl.h} max={360}
            onChange={(v) => commit(hslToHex(v, hsl.s, hsl.l))} />
          <NumInput label="S" value={hsl.s} max={100}
            onChange={(v) => commit(hslToHex(hsl.h, v, hsl.l))} />
          <NumInput label="L" value={hsl.l} max={100}
            onChange={(v) => commit(hslToHex(hsl.h, hsl.s, v))} />
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Recent</div>
          <div className="flex flex-wrap gap-1">
            {recent.map((c) => (
              <button
                key={c}
                onClick={() => commit(c)}
                title={c}
                className="h-5 w-5 rounded border transition hover:scale-110"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      )}

      {!compact && (
        <Tabs defaultValue="Brand">
          <TabsList className="grid w-full grid-cols-4">
            {(Object.keys(CURATED) as (keyof typeof CURATED)[]).map((k) => (
              <TabsTrigger key={k} value={k} className="text-[10px]">{k}</TabsTrigger>
            ))}
          </TabsList>
          {(Object.keys(CURATED) as (keyof typeof CURATED)[]).map((k) => (
            <TabsContent key={k} value={k} className="mt-2">
              <div className="flex flex-wrap gap-1">
                {CURATED[k].map((c) => (
                  <button
                    key={c}
                    onClick={() => commit(c)}
                    title={c}
                    className="h-6 w-6 rounded border transition hover:scale-110"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function NumInput({
  label, value, max, onChange,
}: {
  label: string; value: number; max: number; onChange: (n: number) => void;
}) {
  return (
    <label className="flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs">
      <span className="w-3 text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(0, Math.min(max, n)));
        }}
        className="w-full bg-transparent tabular-nums outline-none"
      />
    </label>
  );
}

/* ------------ component ------------ */
export function ColorPanel({ color, onColorChange, onApplyGradientTexture }: Props) {
  // -------- gradient state --------
  const [stops, setStops] = useState<{ color: string; offset: number }[]>([
    { color: "#7e3c8c", offset: 0 },
    { color: "#ffd166", offset: 1 },
  ]);
  const [angle, setAngle] = useState(90);

  const gradientCSS = useMemo(() => {
    const sorted = [...stops].sort((a, b) => a.offset - b.offset);
    return `linear-gradient(${angle}deg, ${sorted.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(", ")})`;
  }, [stops, angle]);

  const applyGradient = () => {
    const sorted = [...stops].sort((a, b) => a.offset - b.offset);
    const url = gradientToDataUrl(sorted, angle, 512);
    if (url) onApplyGradientTexture(url);
  };

  return (
    <Tabs defaultValue="solid" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="solid" className="text-xs">Solid</TabsTrigger>
        <TabsTrigger value="gradient" className="text-xs">Gradient</TabsTrigger>
      </TabsList>

      {/* ---------- SOLID ---------- */}
      <TabsContent value="solid" className="mt-3">
        <ColorPickerBlock color={color} onColorChange={onColorChange} />
      </TabsContent>

      {/* ---------- GRADIENT ---------- */}
      <TabsContent value="gradient" className="mt-3 space-y-3">
        <div className="h-16 w-full rounded-md border" style={{ background: gradientCSS }} />

        <div className="space-y-2">
          {stops.map((stop, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="color" value={stop.color}
                onChange={(e) => setStops((arr) => arr.map((x, j) => j === i ? { ...x, color: e.target.value } : x))}
                className="h-8 w-8 cursor-pointer rounded border" />
              <Slider value={[stop.offset * 100]} min={0} max={100} step={1}
                onValueChange={(v) => setStops((arr) => arr.map((x, j) => j === i ? { ...x, offset: v[0] / 100 } : x))}
                className="flex-1" />
              <span className="w-9 text-right text-[10px] tabular-nums text-muted-foreground">{Math.round(stop.offset * 100)}%</span>
              {stops.length > 2 && (
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => setStops((arr) => arr.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          {stops.length < 6 && (
            <Button size="sm" variant="outline" className="w-full"
              onClick={() => setStops((arr) => [...arr, { color: "#ffffff", offset: 0.5 }])}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />Add stop
            </Button>
          )}
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs">
            <Label className="text-muted-foreground">Angle</Label>
            <span className="tabular-nums">{Math.round(angle)}°</span>
          </div>
          <Slider value={[angle]} min={0} max={360} step={1} onValueChange={(v) => setAngle(v[0])} />
        </div>

        <Button size="sm" className="w-full" onClick={applyGradient}>
          <Paintbrush className="mr-1.5 h-4 w-4" />Apply gradient to part
        </Button>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Bakes the gradient into a tiling texture so you can still adjust scale & rotation below.
        </p>
      </TabsContent>
    </Tabs>
  );
}
