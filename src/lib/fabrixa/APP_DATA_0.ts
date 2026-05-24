// =============================================================
// APP_DATA_0 — central config for Fabrixa.
// SECRETS (db.firebase, razorpay.*) come from /APP_DATA_0.json in
// the project root — single source of truth, per spec.
// =============================================================
import rootConfig from "../../../APP_DATA_0.json";

const ROOT = rootConfig as {
  db: {
    provider: "firebase" | "supabase";
    firebase: {
      apiKey: string; authDomain: string; projectId: string;
      storageBucket: string; messagingSenderId: string; appId: string;
      measurementId?: string;
    };
  };
  razorpay: {
    rzp_key_id: string;
    rzp_key_secret: string;
    rzp_webhook_secret: string;
    currency: string;
  };
  ai: {
    provider: string;
    apiKey: string;
    baseUrl: string;
    imageModel?: string;
    textModel?: string;
  };
};

export const APP_DATA_0 = {
  ai: {
    provider: ROOT.ai.provider as "openai" | "gemini" | "replicate" | "custom",
    apiKey: ROOT.ai.apiKey,
    baseUrl: ROOT.ai.baseUrl,
    imageModel: ROOT.ai.imageModel ?? "gemini-2.0-flash-preview-image-generation",
    textModel: ROOT.ai.textModel ?? "gemini-2.0-flash",
    models: {
      imageGen: ROOT.ai.imageModel ?? "gemini-2.0-flash-preview-image-generation",
      imageEdit: ROOT.ai.imageModel ?? "gemini-2.0-flash-preview-image-generation",
      neckDesign: ROOT.ai.imageModel ?? "gemini-2.0-flash-preview-image-generation",
      textToPattern: ROOT.ai.textModel ?? "gemini-2.0-flash",
    },
    maxRequestsPerMinute: 20,
    timeoutMs: 60_000,
  },

  db: {
    provider: ROOT.db.provider,
    firebase: ROOT.db.firebase,
    // STRICT: exactly three flat top-level collections. No subcollections.
    collections: {
      users: "users",
      projects: "projects",
      showroomDesigns: "showroomDesigns",
    },
  },

  // ----- Razorpay (read from root APP_DATA_0.json) -----
  razorpay: ROOT.razorpay,

  // ----- Coin economy (per-action costs) -----
  coinCosts: {
    uploadPattern: 2,
    render3d: 3,
    exportNormal: 4,
    exportHd: 6,
    showroomDownload: 6,
    aiGeneration: 10,
  },

  // ----- Subscription tiers -----
  tiers: {
    starter_4000: {
      id: "starter_4000",
      label: "Starter",
      priceInr: 4000,
      dailyAllowance: 50,
      maxSaves: 8,
      maxShowroomDownloadsPerDay: 2,
      allowedModels: ["kurti", "salwar", "gown", "shirt", "tshirt", "pant"],
      allowedMaterials: ["cotton", "satin"],
      allowedBackgrounds: ["transparent", "black"],
      aiIncluded: false,
      allowCustomGlb: false,
      alignmentGuides: false,
    },
    studio_16000: {
      id: "studio_16000",
      label: "Studio",
      priceInr: 16000,
      dailyAllowance: 220,
      maxSaves: 100,
      maxShowroomDownloadsPerDay: 15,
      allowedModels: "ALL" as const,
      allowedMaterials: "ALL" as const,
      allowedBackgrounds: "ALL" as const,
      aiIncluded: true,
      allowCustomGlb: false,
      alignmentGuides: false,
    },
    prod_24000: {
      id: "prod_24000",
      label: "Production",
      priceInr: 24000,
      dailyAllowance: 1200,
      maxSaves: Infinity,
      maxShowroomDownloadsPerDay: 100,
      allowedModels: "ALL" as const,
      allowedMaterials: "ALL" as const,
      allowedBackgrounds: "ALL" as const,
      aiIncluded: true,
      allowCustomGlb: true,
      alignmentGuides: true,
    },
  },

  // ----- AI Pack add-on -----
  aiPack: {
    priceInr: 900,
    dailyRequests: 20,
    durationDays: 30,
  },

  // ----- Admin bypass (loaded from /admin.json at runtime; this is fallback) -----
  admin: {
    enabled: true,
    bypassLabel: "Admin Demo",
  },

  // ===== Legacy fields kept for back-compat with existing editor code =====
  credits: {
    startingBalance: 50,
    dailyFreeGrant: 0,
    costs: {
      aiImageGen: 10,
      aiImageEdit: 10,
      aiNeckDesign: 10,
      export: 4,
      render3d: 3,
    },
    render3dByType: {
      shirt: 3, tshirt: 3, pant: 3, trackpants: 3, hoodie: 3,
      skirt: 3, lehenga: 3, gown: 3, kurti: 3, kurta: 3, salwar: 3,
      coat: 3, plazo: 3, jacket: 3, dress: 3,
    } as Record<string, number>,
  },

  storage: { bucket: "fabrixa-uploads", publicReadPrefix: "public/" },

  features: {
    aiSection: true,
    lassoSelect: true,
    neckDesigner: true,
    gradientColors: true,
    creditSystem: true,
    cloudSync: true,
    subscriptionPaywall: true,
  },

  perf: { maxTextureSize: 1024, maxAnisotropy: 8, targetFps: 30, dprCap: 2 },

  fabricPresets: {
    cotton:  { roughness: 0.88, metalness: 0.00, sheen: 0.05, sheenRoughness: 0.9, clearcoat: 0.00, envIntensity: 0.85 },
    linen:   { roughness: 0.94, metalness: 0.00, sheen: 0.10, sheenRoughness: 0.8, clearcoat: 0.00, envIntensity: 0.80 },
    silk:    { roughness: 0.32, metalness: 0.00, sheen: 0.85, sheenRoughness: 0.25, clearcoat: 0.05, envIntensity: 1.15 },
    satin:   { roughness: 0.22, metalness: 0.05, sheen: 0.70, sheenRoughness: 0.30, clearcoat: 0.10, envIntensity: 1.20 },
    velvet:  { roughness: 0.95, metalness: 0.00, sheen: 1.00, sheenRoughness: 0.15, clearcoat: 0.00, envIntensity: 0.70 },
    denim:   { roughness: 0.92, metalness: 0.00, sheen: 0.03, sheenRoughness: 0.9, clearcoat: 0.00, envIntensity: 0.75 },
    chiffon: { roughness: 0.55, metalness: 0.00, sheen: 0.45, sheenRoughness: 0.5, clearcoat: 0.00, envIntensity: 1.05 },
    wool:    { roughness: 0.96, metalness: 0.00, sheen: 0.25, sheenRoughness: 0.6, clearcoat: 0.00, envIntensity: 0.70 },
  },

  tiling: {
    defaultMode: "world" as "uv" | "world",
    defaultWorldScale: 0.35,
    triplanarBlend: 4.0,
  },

  debug: { showTilingOverlay: false },

  selection: {
    defaultBrushSize: 36,
    defaultFeatherPx: 12,
    defaultOpacity: 1.0,
    defaultExpandPx: 0,
    antsSpeedMs: 60,
    antsDash: [6, 4] as [number, number],
    pointerThrottleMs: 16,
    maxPolygonPoints: 256,
  },

  embroidery: {
    threadColors: ["#d4af37", "#b8002a", "#1c2538", "#0f3460", "#7e3c8c", "#ffffff"],
    defaultDensity: 3,
  },
} as const;

export type AppConfig = typeof APP_DATA_0;
export type FabricPresetId = keyof typeof APP_DATA_0.fabricPresets;
export const FABRIC_PRESET_IDS = Object.keys(APP_DATA_0.fabricPresets) as FabricPresetId[];

export type SubscriptionTierId = keyof typeof APP_DATA_0.tiers;
export type CoinAction = keyof typeof APP_DATA_0.coinCosts;
