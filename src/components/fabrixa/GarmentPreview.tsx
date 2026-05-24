import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Bounds, Html } from "@react-three/drei";
import * as THREE from "three";
import {
  getGarment,
  type GarmentTypeId,
  type PartState,
  partKey,
} from "@/lib/fabrixa/garments";
import type { ScenePreset } from "@/lib/fabrixa/scenePresets";
import { loadGarmentModel, disposeScene } from "@/lib/fabrixa/modelLoader";
import { resolveMeshPartId } from "@/lib/fabrixa/meshUtils";
import { textureCache, applyTextureTransform } from "@/lib/fabrixa/textureCache";
import { APP_DATA_0 } from "@/lib/fabrixa/APP_DATA_0";
import {
  enableWorldTiling,
  disableWorldTiling,
  updateWorldTilingUniforms,
} from "@/lib/fabrixa/worldTiling";
import { LassoComputer } from "@/components/fabrixa/LassoSelector";

interface Props {
  typeId: GarmentTypeId;
  partStates: Record<string, PartState>;
  activePart: string;
  scene: ScenePreset;
  autoRotate: boolean;
  showMannequin: boolean;
  onSelectPart: (partKey: string) => void;
  lassoActive?: boolean;
  onLassoMask?: (partKey: string, dataUrl: string, triCount: number) => void;
}

/* ============================================================
 * Material application — single source of truth for recoloring
 * and texturing a mesh. Used by both GLB and procedural paths.
 * ============================================================ */

interface AppliedMaterialState {
  /** Last applied texture src — used to release from cache when changed. */
  appliedTextureSrc: string | null;
  /** Cached pointer to the GLB's original baked baseColor map (if any).
   *  We preserve it so we can restore it whenever the user clears their
   *  custom texture, keeping the original look intact. */
  originalMap: THREE.Texture | null;
  originalMapCached: boolean;
  /** Cached original base color so neutral state restores the model's look. */
  originalColor: THREE.Color | null;
}

const MATERIAL_USERDATA_KEY = "__fabrixa_applied";

function getOrInitState(mat: THREE.Material): AppliedMaterialState {
  const ud = mat.userData as Record<string, unknown>;
  let s = ud[MATERIAL_USERDATA_KEY] as AppliedMaterialState | undefined;
  if (!s) {
    s = {
      appliedTextureSrc: null,
      originalMap: null,
      originalMapCached: false,
      originalColor: null,
    };
    ud[MATERIAL_USERDATA_KEY] = s;
  }
  return s;
}

function applyPartToMaterial(
  material: THREE.Material,
  state: PartState | undefined,
  isActive: boolean,
) {
  if (!material) return;
  const mat = material as THREE.MeshStandardMaterial;
  const internal = getOrInitState(mat);

  // ---- DEFAULT WHITE: strip baked GLB color/textures on first touch ----
  // The brief is: all garments render as clean white by default, so any
  // applied pattern shows up exactly as the user designed it (without the
  // model's baked color/texture multiplying through and tinting it).
  if (!internal.originalMapCached) {
    internal.originalMap = mat.map ?? null; // kept only so we could restore on demand
    internal.originalColor = mat.color ? mat.color.clone() : null;
    internal.originalMapCached = true;
    // Drop the baked diffuse + emissive map entirely.
    mat.map = null;
    mat.emissiveMap = null;
    if (mat.emissive) mat.emissive.set(0x000000);
    if (mat.color) mat.color.set("#ffffff");
    mat.needsUpdate = true;
  }

  // ---- COLOR (clean white when neutral, tints when user picks one) ----
  const userColor = state?.color;
  const isUserColor =
    !!userColor && userColor !== "#ffffff" && userColor !== "#dddddd";
  if (mat.color) {
    mat.color.set(isUserColor ? userColor! : "#ffffff");
  } else {
    (mat as unknown as { color: THREE.Color }).color = new THREE.Color(
      isUserColor ? userColor! : "#ffffff",
    );
  }

  // ---- TEXTURE: prefer padded version (tile-gap) when present ----
  const desiredSrc = state?.texturePaddedDataUrl ?? state?.textureDataUrl ?? null;
  if (desiredSrc !== internal.appliedTextureSrc) {
    if (internal.appliedTextureSrc) {
      textureCache.release(internal.appliedTextureSrc, mat.map ?? null);
    }
    if (desiredSrc) {
      const t = textureCache.acquire(desiredSrc);
      // Smooth, anisotropic sampling — keeps user's pattern crisp on curves.
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = APP_DATA_0.perf.maxAnisotropy;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = true;
      t.needsUpdate = true;
      mat.map = t;
    } else {
      // No user texture → pure white (no baked map restored).
      mat.map = null;
    }
    internal.appliedTextureSrc = desiredSrc;
    mat.needsUpdate = true;
  }

  // ---- TILING (UV vs world-space triplanar) ----
  const tilingMode = state?.tilingMode ?? "uv";
  if (mat.map && state) {
    applyTextureTransform(mat.map, {
      scale: state.textureScale,
      rotation: state.textureRotation,
      offsetX: state.textureOffsetX,
      offsetY: state.textureOffsetY,
    });
  }
  if (mat.map && tilingMode === "world") {
    enableWorldTiling(mat, {
      worldScale: state?.worldTilingScale ?? APP_DATA_0.tiling.defaultWorldScale,
      rotationDeg: state?.textureRotation ?? 0,
    });
    updateWorldTilingUniforms(mat, {
      worldScale: state?.worldTilingScale ?? APP_DATA_0.tiling.defaultWorldScale,
      rotationDeg: state?.textureRotation ?? 0,
    });
  } else {
    disableWorldTiling(mat);
  }

  // ---- FABRIC PRESET ----
  const presetId = state?.fabricPreset ?? "cotton";
  const preset = APP_DATA_0.fabricPresets[presetId] ?? APP_DATA_0.fabricPresets.cotton;
  if (typeof mat.roughness === "number") mat.roughness = preset.roughness;
  if (typeof mat.metalness === "number") mat.metalness = preset.metalness;
  if ("sheen" in mat) {
    (mat as THREE.MeshPhysicalMaterial).sheen = preset.sheen;
    (mat as THREE.MeshPhysicalMaterial).sheenRoughness = preset.sheenRoughness;
    if (!(mat as THREE.MeshPhysicalMaterial).sheenColor) {
      (mat as THREE.MeshPhysicalMaterial).sheenColor = new THREE.Color("#ffffff");
    }
  }
  if ("clearcoat" in mat) {
    (mat as THREE.MeshPhysicalMaterial).clearcoat = preset.clearcoat;
    (mat as THREE.MeshPhysicalMaterial).clearcoatRoughness = 0.4;
  }
  mat.envMapIntensity = preset.envIntensity;

  // ---- ACTIVE PART HIGHLIGHT ----
  if (mat.emissive) {
    mat.emissive.set(isActive ? "#7e3c8c" : "#000000");
    mat.emissiveIntensity = isActive ? 0.14 : 0;
  }
}

function releaseAllMaterialTextures(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m) continue;
      const s = (m.userData as Record<string, unknown>)[MATERIAL_USERDATA_KEY] as
        | AppliedMaterialState
        | undefined;
      if (s?.appliedTextureSrc) {
        const mm = m as THREE.MeshStandardMaterial;
        textureCache.release(s.appliedTextureSrc, mm.map ?? null);
        s.appliedTextureSrc = null;
        mm.map = null;
      }
    }
  });
}

/* ============================================================
 * GLB-driven garment view
 * ============================================================ */

function GlbGarment({
  typeId, partStates, activePart, onSelectPart, scene,
}: {
  typeId: GarmentTypeId;
  partStates: Record<string, PartState>;
  activePart: string;
  onSelectPart: (k: string) => void;
  scene: THREE.Group;
}) {
  const garment = getGarment(typeId);

  useEffect(() => {
    let meshIndex = 0;
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const partId = resolveMeshPartId(garment, mesh, meshIndex++);
      const key = partKey(garment.id, partId);
      const state = partStates[key];
      const isActive = activePart === key;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m && applyPartToMaterial(m, state, isActive));
      mesh.userData.partKey = key;
    });
  }, [scene, garment, partStates, activePart]);

  return (
    <primitive
      object={scene}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const k = (e.object.userData as { partKey?: string }).partKey;
        if (k) onSelectPart(k);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    />
  );
}

/* ============================================================
 * Procedural fallback meshes
 * ============================================================ */

type ProcProps = {
  typeId: GarmentTypeId;
  partStates: Record<string, PartState>;
  activePart: string;
  onSelectPart: (k: string) => void;
};

function PartMesh({
  typeId, partId, partStates, activePart, onSelectPart, children, ...props
}: ProcProps & {
  partId: string;
  children: React.ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const k = partKey(typeId, partId);
  const state = partStates[k];
  const isActive = activePart === k;

  useEffect(() => {
    if (matRef.current) applyPartToMaterial(matRef.current, state, isActive);
  });

  // Release texture refs from this material on unmount
  useEffect(() => {
    const mat = matRef.current;
    return () => {
      if (!mat) return;
      const s = (mat.userData as Record<string, unknown>)[MATERIAL_USERDATA_KEY] as
        | AppliedMaterialState | undefined;
      if (s?.appliedTextureSrc) {
        textureCache.release(s.appliedTextureSrc, mat.map ?? null);
        s.appliedTextureSrc = null;
        mat.map = null;
      }
    };
  }, []);

  return (
    <mesh
      {...props}
      castShadow
      receiveShadow
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelectPart(k); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "default"; }}
    >
      {children}
      <meshStandardMaterial ref={matRef} />
    </mesh>
  );
}

/* — per-garment procedural geometry. Each PartMesh covers a single part id. — */

const Mirror = (els: (s: -1 | 1) => React.ReactNode) => [-1, 1].map((s) => els(s as -1 | 1));

function Shirt(p: ProcProps) {
  return (
    <group position={[0, -0.8, 0]}>
      <PartMesh {...p} partId="body" position={[0, 1.3, 0]}><boxGeometry args={[1.0, 1.5, 0.45]} /></PartMesh>
      {Mirror((s) => (
        <PartMesh key={s} {...p} partId="sleeves" position={[s * 0.65, 1.55, 0]} rotation={[0, 0, s * 0.35]}>
          <cylinderGeometry args={[0.16, 0.18, 1.0, 16]} />
        </PartMesh>
      ))}
      {Mirror((s) => (
        <PartMesh key={`c${s}`} {...p} partId="cuffs" position={[s * 1.1, 1.05, 0]} rotation={[0, 0, s * 0.35]}>
          <cylinderGeometry args={[0.19, 0.19, 0.1, 16]} />
        </PartMesh>
      ))}
      <PartMesh {...p} partId="collar" position={[0, 2.0, 0.1]} rotation={[0.4, 0, 0]}>
        <torusGeometry args={[0.22, 0.05, 12, 24, Math.PI]} />
      </PartMesh>
      {[1.7, 1.4, 1.1, 0.8].map((y, i) => (
        <PartMesh key={i} {...p} partId="buttons" position={[0, y, 0.23]}>
          <sphereGeometry args={[0.03, 12, 12]} />
        </PartMesh>
      ))}
    </group>
  );
}

function TShirt(p: ProcProps) {
  return (
    <group position={[0, -0.8, 0]}>
      <PartMesh {...p} partId="body" position={[0, 1.4, 0]}><boxGeometry args={[1.0, 1.2, 0.45]} /></PartMesh>
      {Mirror((s) => (
        <PartMesh key={s} {...p} partId="sleeves" position={[s * 0.65, 1.75, 0]} rotation={[0, 0, s * 0.4]}>
          <cylinderGeometry args={[0.18, 0.18, 0.4, 16]} />
        </PartMesh>
      ))}
      <PartMesh {...p} partId="collar" position={[0, 2.0, 0]}><torusGeometry args={[0.18, 0.04, 12, 24]} /></PartMesh>
    </group>
  );
}

function Pant(p: ProcProps) {
  return (
    <group position={[0, -1.2, 0]}>
      <PartMesh {...p} partId="waistband" position={[0, 1.45, 0]}><cylinderGeometry args={[0.45, 0.45, 0.12, 24]} /></PartMesh>
      {Mirror((s) => (
        <PartMesh key={s} {...p} partId="legs" position={[s * 0.2, 0.5, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 1.7, 16]} />
        </PartMesh>
      ))}
      {Mirror((s) => (
        <PartMesh key={`p${s}`} {...p} partId="pocket" position={[s * 0.32, 1.15, 0.2]}>
          <boxGeometry args={[0.22, 0.18, 0.02]} />
        </PartMesh>
      ))}
    </group>
  );
}

function Top(p: ProcProps) {
  return (
    <group position={[0, -0.6, 0]}>
      <PartMesh {...p} partId="body" position={[0, 1.4, 0]}><cylinderGeometry args={[0.42, 0.48, 1.0, 24]} /></PartMesh>
      {Mirror((s) => (
        <PartMesh key={s} {...p} partId="sleeves" position={[s * 0.55, 1.65, 0]} rotation={[0, 0, s * 0.4]}>
          <cylinderGeometry args={[0.14, 0.16, 0.55, 16]} />
        </PartMesh>
      ))}
      <PartMesh {...p} partId="neckline" position={[0, 1.95, 0]}><torusGeometry args={[0.18, 0.035, 12, 24]} /></PartMesh>
    </group>
  );
}

function TrackPants(p: ProcProps) {
  return (
    <group position={[0, -1.2, 0]}>
      <PartMesh {...p} partId="waistband" position={[0, 1.45, 0]}><cylinderGeometry args={[0.46, 0.46, 0.14, 24]} /></PartMesh>
      {Mirror((s) => (
        <PartMesh key={s} {...p} partId="legs" position={[s * 0.22, 0.5, 0]}>
          <cylinderGeometry args={[0.2, 0.22, 1.75, 16]} />
        </PartMesh>
      ))}
      {Mirror((s) => (
        <PartMesh key={`st${s}`} {...p} partId="stripes" position={[s * 0.42, 0.5, 0]}>
          <boxGeometry args={[0.04, 1.7, 0.02]} />
        </PartMesh>
      ))}
    </group>
  );
}

function Hoodie(p: ProcProps) {
  return (
    <group position={[0, -0.8, 0]}>
      <PartMesh {...p} partId="body" position={[0, 1.3, 0]}><boxGeometry args={[1.1, 1.5, 0.5]} /></PartMesh>
      {Mirror((s) => (
        <PartMesh key={s} {...p} partId="sleeves" position={[s * 0.7, 1.55, 0]} rotation={[0, 0, s * 0.35]}>
          <cylinderGeometry args={[0.18, 0.2, 1.0, 16]} />
        </PartMesh>
      ))}
      {Mirror((s) => (
        <PartMesh key={`c${s}`} {...p} partId="cuffs" position={[s * 1.15, 1.05, 0]} rotation={[0, 0, s * 0.35]}>
          <cylinderGeometry args={[0.21, 0.21, 0.12, 16]} />
        </PartMesh>
      ))}
      <PartMesh {...p} partId="hood" position={[0, 2.15, -0.1]}>
        <sphereGeometry args={[0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.6]} />
      </PartMesh>
      <PartMesh {...p} partId="pocket" position={[0, 0.95, 0.27]}><boxGeometry args={[0.7, 0.35, 0.05]} /></PartMesh>
    </group>
  );
}

function Skirt(p: ProcProps) {
  return (
    <group position={[0, -1, 0]}>
      <PartMesh {...p} partId="waistband" position={[0, 1.45, 0]}><cylinderGeometry args={[0.52, 0.52, 0.12, 24]} /></PartMesh>
      <PartMesh {...p} partId="skirt" position={[0, 0.8, 0]}><coneGeometry args={[0.95, 1.3, 24, 1, true]} /></PartMesh>
    </group>
  );
}

function Lehenga(p: ProcProps) {
  return (
    <group position={[0, -1.4, 0]}>
      <PartMesh {...p} partId="blouse" position={[0, 2.0, 0]}><cylinderGeometry args={[0.42, 0.5, 0.55, 24]} /></PartMesh>
      <PartMesh {...p} partId="skirt" position={[0, 0.6, 0]}><coneGeometry args={[1.4, 2.0, 32, 1, true]} /></PartMesh>
      <PartMesh {...p} partId="border" position={[0, -0.35, 0]}><torusGeometry args={[1.4, 0.05, 12, 48]} /></PartMesh>
      <PartMesh {...p} partId="dupatta" position={[0.35, 1.7, 0.35]} rotation={[0.2, 0.2, -0.2]}>
        <planeGeometry args={[1.7, 2.4, 16, 16]} />
      </PartMesh>
    </group>
  );
}

function Gown(p: ProcProps) {
  return (
    <group position={[0, -1.2, 0]}>
      <PartMesh {...p} partId="bodice" position={[0, 1.9, 0]}><cylinderGeometry args={[0.4, 0.5, 0.7, 24]} /></PartMesh>
      <PartMesh {...p} partId="skirt" position={[0, 0.6, 0]}><coneGeometry args={[1.2, 1.8, 32, 1, true]} /></PartMesh>
      {Mirror((s) => (
        <PartMesh key={s} {...p} partId="sleeves" position={[s * 0.55, 1.85, 0]} rotation={[0, 0, s * 0.4]}>
          <cylinderGeometry args={[0.12, 0.16, 1.0, 16]} />
        </PartMesh>
      ))}
      <PartMesh {...p} partId="trim" position={[0, -0.3, 0]}><torusGeometry args={[1.2, 0.04, 8, 48]} /></PartMesh>
    </group>
  );
}

function Kurti(p: ProcProps) {
  return (
    <group position={[0, -1, 0]}>
      <PartMesh {...p} partId="body" position={[0, 1.4, 0]}><cylinderGeometry args={[0.55, 0.7, 1.6, 32]} /></PartMesh>
      <PartMesh {...p} partId="neckline" position={[0, 2.1, 0]}><torusGeometry args={[0.18, 0.04, 12, 24]} /></PartMesh>
      {Mirror((s) => (
        <PartMesh key={s} {...p} partId="sleeves" position={[s * 0.65, 1.85, 0]} rotation={[0, 0, s * 0.3]}>
          <cylinderGeometry args={[0.16, 0.18, 0.7, 16]} />
        </PartMesh>
      ))}
      <PartMesh {...p} partId="hem" position={[0, 0.55, 0]}><torusGeometry args={[0.7, 0.04, 8, 48]} /></PartMesh>
    </group>
  );
}

function Kurta(p: ProcProps) {
  return (
    <group position={[0, -1.1, 0]}>
      <PartMesh {...p} partId="body" position={[0, 1.4, 0]}><cylinderGeometry args={[0.55, 0.62, 1.9, 24]} /></PartMesh>
      {Mirror((s) => (
        <PartMesh key={s} {...p} partId="sleeves" position={[s * 0.65, 1.85, 0]} rotation={[0, 0, s * 0.3]}>
          <cylinderGeometry args={[0.17, 0.19, 1.0, 16]} />
        </PartMesh>
      ))}
      <PartMesh {...p} partId="collar" position={[0, 2.25, 0]}><cylinderGeometry args={[0.18, 0.18, 0.12, 16]} /></PartMesh>
      <PartMesh {...p} partId="placket" position={[0, 1.6, 0.56]}><boxGeometry args={[0.08, 0.9, 0.02]} /></PartMesh>
      {[2.05, 1.85, 1.65, 1.45].map((y, i) => (
        <PartMesh key={i} {...p} partId="buttons" position={[0, y, 0.58]}>
          <sphereGeometry args={[0.025, 12, 12]} />
        </PartMesh>
      ))}
    </group>
  );
}

function Salwar(p: ProcProps) {
  return (
    <group position={[0, -1.2, 0]}>
      <PartMesh {...p} partId="waistband" position={[0, 1.45, 0]}><cylinderGeometry args={[0.5, 0.5, 0.12, 24]} /></PartMesh>
      {Mirror((s) => (
        <PartMesh key={s} {...p} partId="legs" position={[s * 0.22, 0.55, 0]}>
          <cylinderGeometry args={[0.36, 0.18, 1.7, 16]} />
        </PartMesh>
      ))}
      {Mirror((s) => (
        <PartMesh key={`c${s}`} {...p} partId="cuffs" position={[s * 0.22, -0.32, 0]}>
          <cylinderGeometry args={[0.19, 0.19, 0.1, 16]} />
        </PartMesh>
      ))}
    </group>
  );
}

function Coat(p: ProcProps) {
  return (
    <group position={[0, -1, 0]}>
      <PartMesh {...p} partId="body" position={[0, 1.2, 0]}><boxGeometry args={[1.1, 2.0, 0.55]} /></PartMesh>
      {Mirror((s) => (
        <PartMesh key={s} {...p} partId="sleeves" position={[s * 0.7, 1.45, 0]} rotation={[0, 0, s * 0.32]}>
          <cylinderGeometry args={[0.18, 0.2, 1.3, 16]} />
        </PartMesh>
      ))}
      <PartMesh {...p} partId="collar" position={[0, 2.05, 0.05]} rotation={[0.4, 0, 0]}>
        <torusGeometry args={[0.25, 0.05, 12, 24, Math.PI]} />
      </PartMesh>
      {Mirror((s) => (
        <PartMesh key={`l${s}`} {...p} partId="lapel" position={[s * 0.25, 1.6, 0.28]} rotation={[0, 0, -s * 0.2]}>
          <boxGeometry args={[0.18, 0.8, 0.04]} />
        </PartMesh>
      ))}
      {[1.7, 1.4, 1.1, 0.8].map((y, i) => (
        <PartMesh key={i} {...p} partId="buttons" position={[0, y, 0.28]}>
          <sphereGeometry args={[0.035, 12, 12]} />
        </PartMesh>
      ))}
    </group>
  );
}

function Plazo(p: ProcProps) {
  return (
    <group position={[0, -1.2, 0]}>
      <PartMesh {...p} partId="waistband" position={[0, 1.45, 0]}><cylinderGeometry args={[0.48, 0.48, 0.12, 24]} /></PartMesh>
      {Mirror((s) => (
        <PartMesh key={s} {...p} partId="legs" position={[s * 0.25, 0.5, 0]}>
          <cylinderGeometry args={[0.42, 0.22, 1.75, 24]} />
        </PartMesh>
      ))}
    </group>
  );
}

function Blouse(p: ProcProps) {
  return (
    <group position={[0, -0.4, 0]}>
      <PartMesh {...p} partId="body" position={[0, 1.6, 0]}><cylinderGeometry args={[0.42, 0.48, 0.7, 24]} /></PartMesh>
      {Mirror((s) => (
        <PartMesh key={s} {...p} partId="sleeves" position={[s * 0.55, 1.75, 0]} rotation={[0, 0, s * 0.45]}>
          <cylinderGeometry args={[0.12, 0.16, 0.4, 16]} />
        </PartMesh>
      ))}
      <PartMesh {...p} partId="neckline" position={[0, 2.0, 0]}><torusGeometry args={[0.17, 0.035, 12, 24]} /></PartMesh>
    </group>
  );
}

function Saree(p: ProcProps) {
  return (
    <group position={[0, -1.2, 0]}>
      <PartMesh {...p} partId="blouse" position={[0, 1.9, 0]}><cylinderGeometry args={[0.45, 0.5, 0.55, 24]} /></PartMesh>
      <PartMesh {...p} partId="pleats" position={[0, 0.8, 0]}><cylinderGeometry args={[0.55, 0.9, 1.7, 32]} /></PartMesh>
      <PartMesh {...p} partId="border" position={[0, -0.05, 0]}><torusGeometry args={[0.9, 0.06, 12, 32]} /></PartMesh>
      <PartMesh {...p} partId="pallu" position={[0.3, 1.6, 0.35]} rotation={[0.2, 0.2, -0.2]}>
        <planeGeometry args={[1.6, 2.2, 16, 16]} />
      </PartMesh>
    </group>
  );
}

const PROCEDURAL: Partial<Record<GarmentTypeId, React.FC<ProcProps>>> = {
  shirt: Shirt,
  tshirt: TShirt,
  pant: Pant,
  trackpants: TrackPants,
  hoodie: Hoodie,
  skirt: Skirt,
  lehenga: Lehenga,
  gown: Gown,
  kurti: Kurti,
  kurta: Kurta,
  salwar: Salwar,
  coat: Coat,
  plazo: Plazo,
  jacket: Coat,
  dress: Gown,
};

function ProceduralGarment(p: ProcProps) {
  const Comp = PROCEDURAL[p.typeId] ?? Shirt;
  return <Comp {...p} />;
}

/* ============================================================
 * Mannequin (optional)
 * ============================================================ */
function Mannequin({ visible, gender }: { visible: boolean; gender: "men" | "women" | "unisex" }) {
  if (!visible) return null;
  const skin = "#e8c39a";
  return (
    <group>
      <mesh position={[0, 2.55, 0]}><sphereGeometry args={[0.27, 24, 24]} /><meshStandardMaterial color={skin} roughness={0.8} /></mesh>
      <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.09, 0.11, 0.18, 12]} /><meshStandardMaterial color={skin} /></mesh>
      {gender === "women" && (
        <mesh position={[0, 1.55, 0.15]}><sphereGeometry args={[0.18, 16, 16]} /><meshStandardMaterial color={skin} /></mesh>
      )}
    </group>
  );
}

/* ============================================================
 * Auto-spin
 * ============================================================ */
function AutoSpin({ enabled, groupRef }: { enabled: boolean; groupRef: React.RefObject<THREE.Group | null> }) {
  useFrame((_, dt) => { if (enabled && groupRef.current) groupRef.current.rotation.y += dt * 0.35; });
  return null;
}

/** Fixes blank first frame when frameloop is demand + container resize. */
function CanvasInvalidator({ typeId }: { typeId: GarmentTypeId }) {
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    let frames = 0;
    const tick = () => {
      invalidate();
      if (++frames < 16) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [typeId, invalidate]);

  useEffect(() => {
    const el = gl.domElement.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => invalidate());
    ro.observe(el);
    return () => ro.disconnect();
  }, [gl, invalidate]);

  return null;
}

/* ============================================================
 * Garment loader — tries GLB first, falls back to procedural.
 * ============================================================ */

interface LoadState {
  status: "idle" | "loading" | "ready" | "fallback";
  scene: THREE.Group | null;
}

function GarmentBody({
  typeId, partStates, activePart, onSelectPart,
}: ProcProps) {
  const [load, setLoad] = useState<LoadState>({ status: "loading", scene: null });

  useEffect(() => {
    let cancelled = false;
    let activeScene: THREE.Group | null = null;
    const garment = getGarment(typeId);
    setLoad({ status: "loading", scene: null });

    if (!garment.modelPath) {
      setLoad({ status: "fallback", scene: null });
      return;
    }

    loadGarmentModel(garment.modelPath).then((res) => {
      if (cancelled) {
        if (res.scene) disposeScene(res.scene);
        return;
      }
      if (res.ok && res.scene) {
        activeScene = res.scene;
        setLoad({ status: "ready", scene: res.scene });
      } else {
        setLoad({ status: "fallback", scene: null });
      }
    });

    return () => {
      cancelled = true;
      if (activeScene) {
        releaseAllMaterialTextures(activeScene);
        disposeScene(activeScene);
      }
    };
  }, [typeId]);

  if (load.status === "loading") {
    return (
      <Html center>
        <div className="rounded-md bg-background/80 px-3 py-1.5 text-xs text-muted-foreground shadow backdrop-blur">
          Loading {getGarment(typeId).label}…
        </div>
      </Html>
    );
  }

  if (load.status === "ready" && load.scene) {
    return (
      <GlbGarment
        typeId={typeId}
        partStates={partStates}
        activePart={activePart}
        onSelectPart={onSelectPart}
        scene={load.scene}
      />
    );
  }

  // Fallback procedural
  return (
    <ProceduralGarment
      typeId={typeId}
      partStates={partStates}
      activePart={activePart}
      onSelectPart={onSelectPart}
    />
  );
}

/* ============================================================
 * Public component
 * ============================================================ */

export function GarmentPreview({
  typeId, partStates, activePart, scene, autoRotate, showMannequin: _showMannequin, onSelectPart,
  lassoActive = false, onLassoMask,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const garment = useMemo(() => getGarment(typeId), [typeId]);
  const isTransparent = scene.id === "transparent";

  useEffect(() => () => { document.body.style.cursor = "default"; }, []);

  // PERF: only render continuously when something needs to animate (spin /
  // lasso). Otherwise demand-render so idle GPU drops to ~0%.
  return (
    <Canvas
      shadows={false}
      camera={{ position: [0, 1.2, 4.5], fov: 40 }}
      dpr={[1, Math.min(1.5, APP_DATA_0.perf.dprCap)]}
      frameloop="always"
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
      style={{ background: isTransparent ? "transparent" : scene.background, width: "100%", height: "100%" }}
    >
      {/* 3-point + fill rig — no shadows (contact shadow gives the ground feel) */}
      <ambientLight intensity={scene.ambient} />
      <hemisphereLight args={["#ffffff", "#cfd0e0", 0.55]} />
      <directionalLight position={[3, 6, 4]} intensity={scene.keyIntensity} />
      <directionalLight position={[-4, 3, -2]} intensity={scene.keyIntensity * 0.5} color="#dfe4ff" />
      <directionalLight position={[0, 4, -5]} intensity={scene.keyIntensity * 0.45} color="#ffe9d0" />
      <directionalLight position={[0, -3, 2]} intensity={0.25} color="#ffffff" />
      <CanvasInvalidator typeId={typeId} />
      <Suspense fallback={null}>
        <group ref={groupRef}>
          <Bounds key={typeId} fit clip observe margin={1.25}>
            <GarmentBody
              typeId={typeId}
              partStates={partStates}
              activePart={activePart}
              onSelectPart={onSelectPart}
            />
          </Bounds>
        </group>
        <Environment preset={scene.envPreset} />
      </Suspense>
      {!isTransparent && (
        <ContactShadows
          position={[0, -1.21, 0]}
          opacity={scene.shadowOpacity}
          scale={6}
          blur={2.4}
          far={3}
          resolution={256}
        />
      )}
      <OrbitControls
        enablePan={!lassoActive}
        enableZoom={!lassoActive}
        enableRotate={!lassoActive}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={2.2}
        maxDistance={8}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.85}
        target={[0, 0.6, 0]}
      />
      <AutoSpin enabled={autoRotate && !lassoActive} groupRef={groupRef} />
      {lassoActive && onLassoMask && (
        <LassoComputer activePart={activePart} onMask={onLassoMask} />
      )}
    </Canvas>
  );
}
