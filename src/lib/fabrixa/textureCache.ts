// Texture cache + factory.
//
// CRITICAL DESIGN (fixes "torn / cut / random" pattern bug):
// Each acquire() returns its OWN THREE.Texture instance so per-part
// repeat/rotation/offset are independent. The underlying HTMLImage is
// shared via the cache (fast, no re-download), but the GPU Texture
// wrappers are unique per material — otherwise multiple parts writing
// to the same `tex.repeat` produce the chopped, mis-tiled look we kept
// seeing.
//
// Tiling rules:
//  - WebGL2 (the only target) supports NPoT RepeatWrapping natively, so
//    we do NOT stretch images to power-of-two anymore. That stretch was
//    distorting non-square uploads and adding to the "torn" look.
//  - center.set(0.5, 0.5) keeps rotation pivoted at the tile center —
//    seamless wrap on rotate.
//  - We pre-decode the image (img.decode()) before flagging needsUpdate
//    so no half-rendered pixels reach the GPU.

import * as THREE from "three";
import { APP_DATA_0 } from "./APP_DATA_0";

interface ImageEntry {
  image: HTMLImageElement;
  loaded: boolean;
  refCount: number;
  textures: Set<THREE.Texture>;
}

class TextureCache {
  private entries = new Map<string, ImageEntry>();

  acquire(src: string): THREE.Texture {
    let entry = this.entries.get(src);
    if (!entry) {
      const image = new Image();
      image.crossOrigin = "anonymous";
      entry = { image, loaded: false, refCount: 0, textures: new Set() };
      this.entries.set(src, entry);

      const onReady = () => {
        const e = this.entries.get(src);
        if (!e) return;
        e.loaded = true;
        for (const t of e.textures) {
          t.image = image;
          t.needsUpdate = true;
        }
      };

      image.onload = () => {
        // decode() lets the browser fully rasterize before upload —
        // prevents the "half-loaded patch" frame.
        const decode = (image as HTMLImageElement & { decode?: () => Promise<void> }).decode;
        if (typeof decode === "function") {
          decode.call(image).then(onReady).catch(onReady);
        } else {
          onReady();
        }
      };
      image.onerror = () => {
        // graceful fallback — leave entry untextured; consumers see base color
        // eslint-disable-next-line no-console
        console.warn("[fabrixa] texture failed to load:", src.slice(0, 60));
      };
      image.src = src;
    }

    entry.refCount += 1;

    const tex = new THREE.Texture();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = APP_DATA_0.perf.maxAnisotropy;
    tex.center.set(0.5, 0.5);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.matrixAutoUpdate = true;
    (tex.userData as Record<string, unknown>).__src = src;

    if (entry.loaded) {
      tex.image = entry.image;
      tex.needsUpdate = true;
    }
    entry.textures.add(tex);
    return tex;
  }

  /** Release a single texture (and decrement refcount). Disposes the
   *  GPU resources for THIS texture, not the cached image. */
  release(src: string, tex?: THREE.Texture | null) {
    const entry = this.entries.get(src);
    if (!entry) return;
    if (tex) {
      try { tex.dispose(); } catch { /* ignore */ }
      entry.textures.delete(tex);
    }
    entry.refCount -= 1;
    if (entry.refCount <= 0) {
      for (const t of entry.textures) {
        try { t.dispose(); } catch { /* ignore */ }
      }
      this.entries.delete(src);
    }
  }

  clear() {
    for (const entry of this.entries.values()) {
      for (const t of entry.textures) {
        try { t.dispose(); } catch { /* ignore */ }
      }
    }
    this.entries.clear();
  }
}

export const textureCache = new TextureCache();

/**
 * Configure a texture with per-part transforms. Idempotent — safe to
 * call every render. Each material has its OWN texture instance
 * (see acquire()), so these writes don't clobber sibling parts.
 *
 * `scale` = tiles per UV unit (higher = denser pattern).
 * Offsets in UV space (0..1 wraps once).
 */
export function applyTextureTransform(
  tex: THREE.Texture,
  opts: { scale: number; rotation: number; offsetX: number; offsetY: number },
) {
  const s = Math.max(0.01, opts.scale);
  tex.repeat.set(s, s);
  tex.rotation = (opts.rotation * Math.PI) / 180;
  tex.offset.set(opts.offsetX, opts.offsetY);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.matrixAutoUpdate = true;
  tex.updateMatrix();
}

/**
 * Generate a CSS-style linear gradient as a data URL, sized for use
 * as a tiling fabric texture. Used by the color picker's "gradient"
 * mode so users can paint gradients onto any garment part.
 */
export function gradientToDataUrl(
  stops: { color: string; offset: number }[],
  angleDeg = 90,
  size = 512,
): string {
  if (typeof document === "undefined") return "";
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const a = (angleDeg * Math.PI) / 180;
  const x = Math.cos(a) * size;
  const y = Math.sin(a) * size;
  const g = ctx.createLinearGradient(
    (size - x) / 2, (size - y) / 2,
    (size + x) / 2, (size + y) / 2,
  );
  for (const s of stops) g.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c.toDataURL("image/png");
}
