// Garment catalog — 16 garment types.
// Each garment defines:
//  - parts: editable regions (color/texture per part)
//  - modelPath: optional GLB file in /public/models/{id}.glb
//  - meshMap: map from GLB node name (or substring match) -> part id, for recoloring imported models
//  - gender: hint for mannequin selection
//
// When a GLB exists at modelPath it's loaded; otherwise the procedural fallback mesh is used.

import { APP_DATA_0, type FabricPresetId } from "./APP_DATA_0";

export interface PartDef {
  id: string;
  label: string;
  defaultColor: string;
}

export interface PartState {
  color: string;
  textureDataUrl: string | null;
  /** Auto-derived padded version of textureDataUrl (white gutters around each
   *  tile). Used when tileGap > 0; falls back to textureDataUrl when 0. */
  texturePaddedDataUrl?: string | null;
  textureScale: number;      // tile count (repeat)
  textureRotation: number;   // degrees
  textureOffsetX: number;
  textureOffsetY: number;
  /** Spacing between tiles, 0–50 (% of tile size). White base shows through. */
  tileGap?: number;
  /** Material preset id (cotton/silk/satin/velvet/denim/chiffon/wool/linen). */
  fabricPreset?: FabricPresetId;
  /** "uv" = legacy per-mesh UV repeat. "world" = triplanar world-space sampling
   *  so patterns wrap continuously across sleeves/body without UV seams. */
  tilingMode?: "uv" | "world";
  /** World units per tile (only used in tilingMode="world"). Smaller = denser. */
  worldTilingScale?: number;
  /** UV-space alpha mask (data URL). When set, only this region of the part
   *  receives applied patterns. Built by the 3D lasso selector. */
  selectionMaskDataUrl?: string | null;
}

export const defaultPartState = (_defaultColor: string): PartState => ({
  // All garments start as clean, untinted white. Users tint via the color
  // picker; without that the base material renders pure white so applied
  // patterns and gap-between-tiles read accurately.
  color: "#ffffff",
  textureDataUrl: null,
  texturePaddedDataUrl: null,
  textureScale: 4,
  textureRotation: 0,
  textureOffsetX: 0,
  textureOffsetY: 0,
  tileGap: 0,
  fabricPreset: "cotton",
  // UV mode shows the user's pattern EXACTLY (1:1 to selected design).
  tilingMode: "uv",
  worldTilingScale: APP_DATA_0.tiling.defaultWorldScale,
  selectionMaskDataUrl: null,
});

export type GarmentTypeId =
  | "shirt" | "tshirt" | "pant" | "trackpants" | "hoodie"
  | "skirt" | "lehenga" | "gown" | "kurti" | "kurta" | "salwar"
  | "coat" | "plazo" | "jacket" | "dress"
  | "kurti_long" | "kurti_long_neck";

export interface GarmentType {
  id: GarmentTypeId;
  label: string;
  emoji: string;
  gender: "men" | "women" | "unisex";
  parts: PartDef[];
  /** Relative path to GLB inside /public. Loader will fetch /models/<file>. */
  modelPath?: string;
  /** Mapping from GLB mesh / node name (lower-cased, substring match) to a part id. */
  meshMap?: Record<string, string>;
}

const P = (id: string, label: string, defaultColor: string): PartDef => ({ id, label, defaultColor });

export const GARMENT_TYPES: GarmentType[] = [
  {
    id: "shirt", label: "Shirt", emoji: "🧑‍💼", gender: "men",
    parts: [P("body", "Shirt Body", "#dfe9f3"), P("sleeves", "Sleeves", "#dfe9f3"), P("collar", "Collar", "#dfe9f3"), P("cuffs", "Cuffs", "#dfe9f3"), P("buttons", "Buttons", "#222")],
    modelPath: "models/shirt.glb",
    meshMap: { body: "body", sleeve: "sleeves", collar: "collar", cuff: "cuffs", button: "buttons" },
  },
  {
    id: "tshirt", label: "T-Shirt", emoji: "👕", gender: "unisex",
    parts: [P("body", "Body", "#ffffff"), P("sleeves", "Sleeves", "#ffffff"), P("collar", "Collar", "#dddddd")],
    modelPath: "models/tshirt.glb",
    meshMap: { body: "body", sleeve: "sleeves", collar: "collar", neck: "collar" },
  },
  {
    id: "pant", label: "Pant", emoji: "👖", gender: "unisex",
    parts: [P("legs", "Legs", "#2e3b55"), P("waistband", "Waistband", "#1c2538"), P("pocket", "Pockets", "#1c2538")],
    modelPath: "models/pant.glb",
    meshMap: { leg: "legs", waist: "waistband", pocket: "pocket" },
  },
  {
    id: "trackpants", label: "Trackpants", emoji: "🏃", gender: "unisex",
    parts: [P("legs", "Legs", "#1a1a1a"), P("waistband", "Waistband", "#3a3a3a"), P("stripes", "Side Stripes", "#ffffff")],
    modelPath: "models/trackpants.glb",
    meshMap: { leg: "legs", waist: "waistband", stripe: "stripes" },
  },
  {
    id: "hoodie", label: "Hoodie", emoji: "🧥", gender: "unisex",
    parts: [P("body", "Body", "#2b2b2b"), P("sleeves", "Sleeves", "#2b2b2b"), P("hood", "Hood", "#2b2b2b"), P("pocket", "Pocket", "#2b2b2b"), P("cuffs", "Cuffs", "#1a1a1a")],
    modelPath: "models/hoodie.glb",
    meshMap: { body: "body", sleeve: "sleeves", hood: "hood", pocket: "pocket", cuff: "cuffs" },
  },
  {
    id: "skirt", label: "Skirt", emoji: "👗", gender: "women",
    parts: [P("skirt", "Skirt", "#7a3b8c"), P("waistband", "Waistband", "#2d1f3a")],
    modelPath: "models/skirt.glb",
    meshMap: { skirt: "skirt", waist: "waistband" },
  },
  {
    id: "lehenga", label: "Lehenga", emoji: "💃", gender: "women",
    parts: [P("skirt", "Lehenga Skirt", "#b8002a"), P("blouse", "Choli/Blouse", "#7a0020"), P("dupatta", "Dupatta", "#e6c200"), P("border", "Border", "#d4af37")],
    modelPath: "models/lehenga.glb",
    meshMap: { skirt: "skirt", lehenga: "skirt", choli: "blouse", blouse: "blouse", dupatta: "dupatta", border: "border" },
  },
  {
    id: "gown", label: "Gown", emoji: "👰", gender: "women",
    parts: [P("bodice", "Bodice", "#3b3b6e"), P("skirt", "Flowing Skirt", "#3b3b6e"), P("sleeves", "Sleeves", "#3b3b6e"), P("trim", "Trim", "#d4af37")],
    modelPath: "models/gown.glb",
    meshMap: { bodice: "bodice", skirt: "skirt", sleeve: "sleeves", trim: "trim" },
  },
  {
    id: "kurti", label: "Kurti", emoji: "🌸", gender: "women",
    parts: [P("body", "Kurti Body", "#e8c4d8"), P("sleeves", "Sleeves", "#e8c4d8"), P("neckline", "Neckline", "#b8860b"), P("hem", "Hem", "#b8860b")],
    modelPath: "models/kurti.glb",
    meshMap: { body: "body", sleeve: "sleeves", neck: "neckline", hem: "hem" },
  },
  {
  id: "kurti_long",
  label: "Kurti (Long)",
  emoji: "👗",
  gender: "women",
  parts: [
    P("body", "Body", "#f5e6ff"),
    P("sleeves", "Sleeves", "#f5e6ff"),
    P("hem", "Hem", "#e8d2ff"),
  ],
  modelPath: "models/kurti long.glb",
  meshMap: {
    body: "body",
    sleeve: "sleeves",
    hem: "hem",
  },
},
{
  id: "kurti_long_neck",
  label: "Kurti (Long Neck)",
  emoji: "👗",
  gender: "women",
  parts: [
    P("body", "Body", "#f5e6ff"),
    P("sleeves", "Sleeves", "#f5e6ff"),
    P("neck", "Neck Design", "#d9b3ff"),
    P("hem", "Hem", "#e8d2ff"),
  ],
  modelPath: "models/kurti long neck.glb",
  meshMap: {
    body: "body",
    sleeve: "sleeves",
    neck: "neck",
    hem: "hem",
  },
},
  {
    id: "kurta", label: "Kurta", emoji: "🕴️", gender: "men",
    parts: [P("body", "Kurta Body", "#f4f1e8"), P("sleeves", "Sleeves", "#f4f1e8"), P("collar", "Mandarin Collar", "#d4af37"), P("placket", "Placket", "#d4af37"), P("buttons", "Buttons", "#3b1f1f")],
    modelPath: "models/kurta.glb",
    meshMap: { body: "body", sleeve: "sleeves", collar: "collar", placket: "placket", button: "buttons" },
  },
  {
    id: "salwar", label: "Salwar", emoji: "👖", gender: "women",
    parts: [P("legs", "Legs", "#f5e6d3"), P("waistband", "Waistband", "#d4a4c8"), P("cuffs", "Ankle Cuffs", "#b8860b")],
    modelPath: "models/salwar.glb",
    meshMap: { leg: "legs", waist: "waistband", cuff: "cuffs", ankle: "cuffs" },
  },
  {
    id: "coat", label: "Coat", emoji: "🧥", gender: "unisex",
    parts: [P("body", "Coat Body", "#2c2c34"), P("sleeves", "Sleeves", "#2c2c34"), P("lapel", "Lapel", "#1a1a22"), P("buttons", "Buttons", "#b8860b"), P("collar", "Collar", "#2c2c34")],
    modelPath: "models/coat.glb",
    meshMap: { body: "body", sleeve: "sleeves", lapel: "lapel", button: "buttons", collar: "collar" },
  },
  {
  id: "plazo", label: "Plazo", emoji: "🎽", gender: "women",
  parts: [P("legs", "Flared Legs", "#3a2e55"), P("waistband", "Waistband", "#2a1f3a")],
  modelPath: "models/plazo.glb",
  meshMap: {
    leg: "legs",
    legs: "legs",
    left_leg: "legs",
    right_leg: "legs",
    pant: "legs",
    pants: "legs",
    plazo: "legs",
    palazzo: "legs",

    waist: "waistband",
    waistband: "waistband",
    belt: "waistband",
    band: "waistband",
  },
},
];

export const getGarment = (id: GarmentTypeId): GarmentType =>
  GARMENT_TYPES.find((g) => g.id === id) ?? GARMENT_TYPES[0];

export const partKey = (typeId: GarmentTypeId, partId: string) => `${typeId}.${partId}`;

export const initStatesFor = (g: GarmentType): Record<string, PartState> => {
  const obj: Record<string, PartState> = {};
  for (const p of g.parts) obj[partKey(g.id, p.id)] = defaultPartState(p.defaultColor);
  return obj;
};

/**
 * Resolve a mesh node name to a part id using the garment's meshMap.
 * Lowercases the node name and does a substring match against each map key.
 * Falls back to "body" / first part / null.
 */
export function resolvePartIdFromNodeName(g: GarmentType, nodeName: string | undefined | null): string | null {
  if (!nodeName) return null;
  const lower = nodeName.toLowerCase();
  const map = g.meshMap ?? {};
  // Prefer longest-key match for specificity
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (lower.includes(k)) return map[k];
  }
  // Fallback: exact part id present in the name
  for (const p of g.parts) {
    if (lower.includes(p.id)) return p.id;
  }
  return null;
}
