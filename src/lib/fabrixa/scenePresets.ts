// 3D scene presets — lighting + background combos for the garment preview.

export type ScenePresetId = "studio" | "runway" | "soft" | "transparent";

export interface ScenePreset {
  id: ScenePresetId;
  label: string;
  background: string;          // CSS bg or "transparent"
  envPreset: "studio" | "city" | "sunset" | "warehouse" | "apartment";
  ambient: number;
  keyIntensity: number;
  shadowOpacity: number;
}

export const SCENE_PRESETS: ScenePreset[] = [
  { id: "studio",      label: "Studio",      background: "#f3eef7", envPreset: "studio",    ambient: 0.55, keyIntensity: 1.1, shadowOpacity: 0.45 },
  { id: "runway",      label: "Runway",      background: "#1a1320", envPreset: "warehouse", ambient: 0.25, keyIntensity: 1.8, shadowOpacity: 0.65 },
  { id: "soft",        label: "Soft Light",  background: "#fff8f0", envPreset: "apartment", ambient: 0.7,  keyIntensity: 0.7, shadowOpacity: 0.3 },
  { id: "transparent", label: "Transparent", background: "transparent", envPreset: "studio", ambient: 0.55, keyIntensity: 1.1, shadowOpacity: 0.4 },
];
