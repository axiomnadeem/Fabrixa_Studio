import * as THREE from "three";
import type { GarmentType } from "./garments";
import { resolvePartIdFromNodeName } from "./garments";

/** Generate planar UVs when a GLB mesh has none (common on CAD exports). */
export function ensureGeometryUV(geom: THREE.BufferGeometry): void {
  const uv = geom.attributes.uv;
  if (uv && uv.count > 0) return;

  const pos = geom.attributes.position;
  if (!pos) return;

  geom.computeBoundingBox();
  const box = geom.boundingBox!;
  const size = new THREE.Vector3();
  box.getSize(size);
  const min = box.min;

  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const u = size.x > 1e-6 ? (x - min.x) / size.x : 0.5;
    const v = size.y > 1e-6 ? (y - min.y) / size.y : size.z > 1e-6 ? (z - min.z) / size.z : 0.5;
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = 1 - v;
  }
  geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geom.attributes.uv.needsUpdate = true;
}

export function resolveMeshPartId(
  garment: GarmentType,
  mesh: THREE.Mesh,
  meshIndex: number,
): string {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const candidates = [
    mesh.name,
    mesh.parent?.name ?? "",
    ...mats.map((m) => m?.name ?? ""),
  ];
  for (const n of candidates) {
    const id = resolvePartIdFromNodeName(garment, n);
    if (id) return id;
  }
  const parts = garment.parts;
  return parts[meshIndex % parts.length]?.id ?? parts[0].id;
}

/** Normalize GLB materials so Fabrixa can apply colors/textures reliably. */
export function normalizeGarmentMaterial(mat: THREE.Material): THREE.MeshStandardMaterial {
  if (mat instanceof THREE.MeshStandardMaterial) {
    mat.side = THREE.DoubleSide;
    return mat;
  }
  const std = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.65,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  if ("color" in mat && (mat as THREE.MeshStandardMaterial).color) {
    std.color.copy((mat as THREE.MeshStandardMaterial).color);
  }
  if ("map" in mat && (mat as THREE.MeshStandardMaterial).map) {
    std.map = (mat as THREE.MeshStandardMaterial).map;
  }
  mat.dispose();
  return std;
}
