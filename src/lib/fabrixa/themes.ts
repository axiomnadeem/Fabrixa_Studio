// Theme presets selectable from Settings. Light/dark toggle is independent.

export type ThemeId = "default" | "neon" | "classic" | "pastel" | "noir" | "royal";

export interface ThemeDef {
  id: ThemeId;
  label: string;
  swatch: string[];
}

export const THEMES: ThemeDef[] = [
  { id: "default", label: "Fabrixa",  swatch: ["#7e3c8c", "#c44569", "#f5e6d3", "#1e1e28"] },
  { id: "neon",    label: "Neon",     swatch: ["#00ffd0", "#ff00aa", "#9d00ff", "#0a0a0f"] },
  { id: "classic", label: "Classic",  swatch: ["#3d2b1f", "#8b6f47", "#d4af37", "#f5f0e1"] },
  { id: "pastel",  label: "Pastel",   swatch: ["#ffd6e0", "#c1eaff", "#fff5b8", "#d9f5d0"] },
  { id: "noir",    label: "Noir",     swatch: ["#0d0d0d", "#1a1a1a", "#c9a84c", "#f0d78c"] },
  { id: "royal",   label: "Royal",    swatch: ["#0f1b3d", "#1e3a5f", "#c9a84c", "#f5f0e0"] },
];
