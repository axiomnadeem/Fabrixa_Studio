// World-space (triplanar) tiling for fabric materials.
//
// Why: per-mesh UV `repeat` resets at every mesh boundary, which produces
// visible seams where sleeves meet the body, mirrored repeats, and "torn"
// patterns on curved garments. Triplanar sampling samples the texture in
// world space using three orthogonal planar projections (XY, ZY, XZ) blended
// by the surface normal — the pattern flows continuously across all parts
// of the garment, regardless of UVs.
//
// Implementation: MeshStandardMaterial.onBeforeCompile shader patch. We
// override #include <map_fragment> with a triplanar version. customProgramCacheKey
// keeps the patched and unpatched variants distinct in three.js' shader cache.
//
// Idempotent: calling enableWorldTiling repeatedly on the same material just
// updates uniforms. Calling disableWorldTiling reverts and forces a recompile.

import * as THREE from "three";
import { APP_DATA_0 } from "./APP_DATA_0";

const FLAG = "__fabrixa_world_tiling";

interface WorldTilingState {
  enabled: boolean;
  uniforms: {
    uWorldTileScale: { value: number };
    uTriplanarBlend: { value: number };
    uTextureRotation: { value: number };
  };
}

function getState(mat: THREE.Material): WorldTilingState {
  const ud = mat.userData as Record<string, unknown>;
  let s = ud[FLAG] as WorldTilingState | undefined;
  if (!s) {
    s = {
      enabled: false,
      uniforms: {
        uWorldTileScale: { value: APP_DATA_0.tiling.defaultWorldScale },
        uTriplanarBlend: { value: APP_DATA_0.tiling.triplanarBlend },
        uTextureRotation: { value: 0 },
      },
    };
    ud[FLAG] = s;
  }
  return s;
}

export function enableWorldTiling(
  material: THREE.Material,
  opts: { worldScale: number; rotationDeg: number },
) {
  const mat = material as THREE.MeshStandardMaterial;
  const state = getState(mat);

  // Live uniform updates — no recompile needed.
  state.uniforms.uWorldTileScale.value = Math.max(0.01, opts.worldScale);
  state.uniforms.uTextureRotation.value = (opts.rotationDeg * Math.PI) / 180;
  state.uniforms.uTriplanarBlend.value = APP_DATA_0.tiling.triplanarBlend;

  if (state.enabled) return;
  state.enabled = true;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWorldTileScale = state.uniforms.uWorldTileScale;
    shader.uniforms.uTriplanarBlend = state.uniforms.uTriplanarBlend;
    shader.uniforms.uTextureRotation = state.uniforms.uTextureRotation;

    // Vertex shader: expose world position + world normal as varyings.
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vFx_worldPos;
varying vec3 vFx_worldNormal;`,
      )
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
#ifdef USE_INSTANCING
  vFx_worldPos = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
#else
  vFx_worldPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
#endif
vFx_worldNormal = normalize( mat3( modelMatrix ) * objectNormal );`,
      );

    // Fragment shader: replace map sampling with a triplanar blend.
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vFx_worldPos;
varying vec3 vFx_worldNormal;
uniform float uWorldTileScale;
uniform float uTriplanarBlend;
uniform float uTextureRotation;

vec2 fx_rotateUV( vec2 uv, float a ) {
  float c = cos(a); float s = sin(a);
  vec2 p = uv - 0.5;
  return vec2( c*p.x - s*p.y, s*p.x + c*p.y ) + 0.5;
}

vec4 fx_triplanar( sampler2D tex, vec3 worldPos, vec3 worldNormal, float scale ) {
  vec3 n = normalize( worldNormal );
  // Tile every \`scale\` world units.
  vec3 p = worldPos / max(scale, 0.0001);
  vec2 uvX = fx_rotateUV( fract(p.yz), uTextureRotation );
  vec2 uvY = fx_rotateUV( fract(p.zx), uTextureRotation );
  vec2 uvZ = fx_rotateUV( fract(p.xy), uTextureRotation );
  vec4 cX = texture2D( tex, uvX );
  vec4 cY = texture2D( tex, uvY );
  vec4 cZ = texture2D( tex, uvZ );
  vec3 w = pow( abs(n), vec3(uTriplanarBlend) );
  w /= max( w.x + w.y + w.z, 0.0001 );
  return cX * w.x + cY * w.y + cZ * w.z;
}`,
      )
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
  vec4 sampledDiffuseColor = fx_triplanar( map, vFx_worldPos, vFx_worldNormal, uWorldTileScale );
  #ifdef DECODE_VIDEO_TEXTURE
    sampledDiffuseColor = sRGBTransferOETF( sampledDiffuseColor );
  #endif
  diffuseColor *= sampledDiffuseColor;
#endif`,
      );
  };

  // Distinct cache key for the patched variant.
  mat.customProgramCacheKey = () => "fabrixa_world_tiling_v1";
  mat.needsUpdate = true;
}

export function disableWorldTiling(material: THREE.Material) {
  const mat = material as THREE.MeshStandardMaterial;
  const state = (mat.userData as Record<string, unknown>)[FLAG] as
    | WorldTilingState
    | undefined;
  if (!state || !state.enabled) return;
  state.enabled = false;
  mat.onBeforeCompile = () => undefined;
  mat.customProgramCacheKey = () => "fabrixa_default_v1";
  mat.needsUpdate = true;
}

/** Update only the live uniforms (cheap, no recompile). */
export function updateWorldTilingUniforms(
  material: THREE.Material,
  opts: { worldScale: number; rotationDeg: number },
) {
  const state = (material.userData as Record<string, unknown>)[FLAG] as
    | WorldTilingState
    | undefined;
  if (!state) return;
  state.uniforms.uWorldTileScale.value = Math.max(0.01, opts.worldScale);
  state.uniforms.uTextureRotation.value = (opts.rotationDeg * Math.PI) / 180;
}