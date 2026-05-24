import { GARMENT_TYPES, type GarmentType, type GarmentTypeId } from "./garments";
import {
  listBundledModelKeys,
  normalizeModelKey,
  resolveBundledGlbUrl,
} from "./garmentAssets";

const EXTRA_GARMENTS: GarmentType[] = [
  {
    id: "jacket",
    label: "Jacket",
    emoji: "🧥",
    gender: "unisex",
    parts: [
      { id: "body", label: "Body", defaultColor: "#2a2a32" },
      { id: "sleeves", label: "Sleeves", defaultColor: "#2a2a32" },
      { id: "collar", label: "Collar", defaultColor: "#1a1a22" },
      { id: "zipper", label: "Zipper", defaultColor: "#888" },
    ],
    modelPath: "models/jacket.glb",
    meshMap: {
      body: "body",
      torso: "body",
      jacket: "body",
      sleeve: "sleeves",
      collar: "collar",
      zip: "zipper",
    },
  },
  {
    id: "dress",
    label: "Dress",
    emoji: "👗",
    gender: "women",
    parts: [
      { id: "bodice", label: "Bodice", defaultColor: "#6b2d5c" },
      { id: "skirt", label: "Skirt", defaultColor: "#6b2d5c" },
      { id: "sleeves", label: "Sleeves", defaultColor: "#6b2d5c" },
    ],
    modelPath: "models/dress.glb",
    meshMap: {
      bodice: "bodice",
      top: "bodice",
      dress: "bodice",
      skirt: "skirt",
      sleeve: "sleeves",
    },
  },
  {
    id: "kurti_long",
    label: "Kurti (Long)",
    emoji: "🌸",
    gender: "women",
    parts: [
      { id: "body", label: "Body", defaultColor: "#e8c4d8" },
      { id: "sleeves", label: "Sleeves", defaultColor: "#e8c4d8" },
      { id: "neckline", label: "Neckline", defaultColor: "#b8860b" },
      { id: "hem", label: "Hem", defaultColor: "#b8860b" },
    ],
    modelPath: "models/kurti long.glb",
    meshMap: {
      body: "body",
      kurti: "body",
      sleeve: "sleeves",
      neck: "neckline",
      hem: "hem",
    },
  },
  {
    id: "kurti_long_neck",
    label: "Kurti (Long Neck)",
    emoji: "🌸",
    gender: "women",
    parts: [
      { id: "body", label: "Body", defaultColor: "#f0d4e8" },
      { id: "sleeves", label: "Sleeves", defaultColor: "#f0d4e8" },
      { id: "neckline", label: "Neckline", defaultColor: "#d4af37" },
      { id: "hem", label: "Hem", defaultColor: "#c9a84c" },
    ],
    modelPath: "models/kurti long neck.glb",
    meshMap: {
      body: "body",
      kurti: "body",
      neck: "neckline",
      collar: "neckline",
      sleeve: "sleeves",
      hem: "hem",
    },
  },
];

const ALL_DEFINITIONS: GarmentType[] = [...GARMENT_TYPES, ...EXTRA_GARMENTS];

function hasBundledModel(g: GarmentType): boolean {
  return !!resolveBundledGlbUrl(g.modelPath ?? g.id);
}

function genericGarmentForKey(key: string): GarmentType {
  const label = key
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return {
    id: key.replace(/\s+/g, "_") as GarmentTypeId,
    label,
    emoji: "👔",
    gender: "unisex",
    parts: [{ id: "body", label: "Body", defaultColor: "#ffffff" }],
    modelPath: `models/${key}.glb`,
    meshMap: { body: "body", mesh: "body" },
  };
}

function buildAvailable(): GarmentType[] {
  const byId = new Map<string, GarmentType>();
  for (const g of ALL_DEFINITIONS) {
    if (hasBundledModel(g)) byId.set(g.id, g);
  }
  for (const key of listBundledModelKeys()) {
    const matched = [...byId.values()].find(
      (g) => normalizeModelKey(g.modelPath ?? "") === key,
    );
    if (matched) continue;
    const slug = key.replace(/\s+/g, "_");
    if (!byId.has(slug)) byId.set(slug, genericGarmentForKey(key));
  }
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export const AVAILABLE_GARMENTS: GarmentType[] = buildAvailable();

export const DEFAULT_GARMENT_ID: GarmentTypeId =
  AVAILABLE_GARMENTS.find((g) => g.id === "shirt")?.id ??
  AVAILABLE_GARMENTS[0]?.id ??
  "shirt";

export function isGarmentAvailable(id: GarmentTypeId): boolean {
  return AVAILABLE_GARMENTS.some((g) => g.id === id);
}
