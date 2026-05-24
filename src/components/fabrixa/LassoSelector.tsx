// 3D lasso selection.
//
// Two pieces:
//  - <LassoOverlay/> — DOM overlay (must live next to the R3F <Canvas/>).
//    Captures pointer events when enabled and draws an SVG polygon.
//  - <LassoComputer/> — R3F child inside <Canvas/>. Uses scene+camera to
//    raycast triangles of the *active part's* meshes that fall inside the
//    drawn polygon, then rasterizes those triangles into a UV-space mask
//    canvas and returns the data URL.
//
// Communication between the two halves uses a tiny module-level event bus
// so we don't have to thread refs through R3F.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

type Pt = { x: number; y: number };

interface LassoRequest {
  id: number;
  points: Pt[];
  rect: { width: number; height: number };
}

const store = {
  request: null as LassoRequest | null,
  listeners: new Set<() => void>(),
};

function notify() {
  store.listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  store.listeners.add(l);
  return () => store.listeners.delete(l);
}

function getSnapshot() {
  return store.request;
}

let reqSeq = 0;
function emitRequest(points: Pt[], rect: { width: number; height: number }) {
  store.request = { id: ++reqSeq, points, rect };
  notify();
}

/* ============================================================
 * DOM overlay — sits over the WebGL canvas.
 * ============================================================ */
export function LassoOverlay({
  enabled,
  onCancel,
  mode = "freehand",
}: {
  enabled: boolean;
  onCancel?: () => void;
  mode?: "freehand" | "polygon";
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const [points, setPoints] = useState<Pt[]>([]);

  if (!enabled) return null;

  const getRect = () => wrapRef.current!.getBoundingClientRect();

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const r = getRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (mode === "polygon") {
      // Click to add a point. Right-click cancels in-progress polygon.
      if (e.button === 2) { setPoints([]); return; }
      setPoints((prev) => [...prev, p]);
      return;
    }
    drawingRef.current = true;
    setPoints([p]);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (mode === "polygon") return;
    if (!drawingRef.current) return;
    const r = getRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    setPoints((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.hypot(last.x - p.x, last.y - p.y) < 2) return prev;
      return [...prev, p];
    });
  };
  const onUp = () => {
    if (mode === "polygon") return;
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (points.length >= 4) {
      const r = getRect();
      emitRequest(points, { width: r.width, height: r.height });
    }
    setPoints([]);
  };

  const closePolygon = () => {
    if (mode !== "polygon") return;
    if (points.length >= 3) {
      const r = getRect();
      emitRequest(points, { width: r.width, height: r.height });
    }
    setPoints([]);
  };

  const d =
    points.length > 1
      ? "M " + points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ") + " Z"
      : "";

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 z-20 cursor-crosshair touch-none select-none"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onDoubleClick={closePolygon}
      onContextMenu={(e) => { e.preventDefault(); if (mode === "polygon") setPoints([]); }}
    >
      {points.length > 1 && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <path
            d={d}
            fill="hsl(var(--primary) / 0.15)"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
          {mode === "polygon" && points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4}
              fill="hsl(var(--primary))" stroke="white" strokeWidth={1.5} />
          ))}
        </svg>
      )}
      <div className="pointer-events-none absolute left-1/2 top-2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-lg">
        {mode === "polygon"
          ? "Click to add points · Double-click or press Close to finish"
          : "Drag to freehand-lasso a region on the model"}
        {mode === "polygon" && points.length >= 3 && (
          <button
            onClick={(e) => { e.stopPropagation(); closePolygon(); }}
            className="pointer-events-auto ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] hover:bg-primary-foreground/30"
          >
            Close
          </button>
        )}
        {onCancel && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="pointer-events-auto ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] hover:bg-primary-foreground/30"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * R3F computer — runs inside <Canvas/>.
 * ============================================================ */

interface ComputerProps {
  activePart: string;
  onMask: (partKey: string, dataUrl: string, triangleCount: number) => void;
  maskSize?: number;
}

export function LassoComputer({ activePart, onMask, maskSize = 1024 }: ComputerProps) {
  const { camera, scene } = useThree();
  const request = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const handledRef = useRef<number>(-1);

  useEffect(() => {
    if (!request || request.id === handledRef.current) return;
    handledRef.current = request.id;

    const { points, rect } = request;
    if (points.length < 3) return;

    // Collect meshes belonging to the active part.
    const meshes: THREE.Mesh[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const k = (m.userData as { partKey?: string }).partKey;
      if (k === activePart) meshes.push(m);
    });

    if (!meshes.length) {
      // No active-part meshes: select all visible meshes as a fallback.
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.visible) meshes.push(m);
      });
    }
    if (!meshes.length) return;

    const W = rect.width;
    const H = rect.height;

    // Pre-build a polygon bbox for quick reject.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    function inPoly(pt: Pt): boolean {
      if (pt.x < minX || pt.x > maxX || pt.y < minY || pt.y > maxY) return false;
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i];
        const b = points[j];
        if (
          a.y > pt.y !== b.y > pt.y &&
          pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y + 1e-9) + a.x
        ) {
          inside = !inside;
        }
      }
      return inside;
    }

    function barycentric(pt: Pt, a: Pt, b: Pt, c: Pt) {
      const v0x = b.x - a.x, v0y = b.y - a.y;
      const v1x = c.x - a.x, v1y = c.y - a.y;
      const v2x = pt.x - a.x, v2y = pt.y - a.y;
      const den = v0x * v1y - v1x * v0y;
      if (Math.abs(den) < 1e-6) return null;
      const u = (v2x * v1y - v1x * v2y) / den;
      const vB = (v0x * v2y - v2x * v0y) / den;
      return { a: 1 - u - vB, b: u, c: vB };
    }

    const v = new THREE.Vector3();
    const proj = new THREE.Vector3();
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const camForward = new THREE.Vector3();
    camera.getWorldDirection(camForward);

    function project(out: Pt, world: THREE.Vector3) {
      proj.copy(world).project(camera);
      out.x = ((proj.x + 1) / 2) * W;
      out.y = ((1 - proj.y) / 2) * H;
      // proj.z in [-1,1]; >1 means behind near plane
    }

    // Build UV-space mask canvas.
    const mc = document.createElement("canvas");
    mc.width = maskSize;
    mc.height = maskSize;
    const mctx = mc.getContext("2d")!;
    mctx.clearRect(0, 0, maskSize, maskSize);
    mctx.fillStyle = "rgba(255,255,255,1)";

    const p0: Pt = { x: 0, y: 0 };
    const p1: Pt = { x: 0, y: 0 };
    const p2: Pt = { x: 0, y: 0 };
    const w0 = new THREE.Vector3();
    const w1 = new THREE.Vector3();
    const w2 = new THREE.Vector3();
    const triNormal = new THREE.Vector3();
    const edge1 = new THREE.Vector3();
    const edge2 = new THREE.Vector3();
    const toCam = new THREE.Vector3();

    let triCount = 0;
    let totalTri = 0;

    for (const mesh of meshes) {
      const geom = mesh.geometry as THREE.BufferGeometry;
      const pos = geom.attributes.position as THREE.BufferAttribute | undefined;
      const uv = geom.attributes.uv as THREE.BufferAttribute | undefined;
      if (!pos || !uv) continue;
      mesh.updateWorldMatrix(true, false);
      const mWorld = mesh.matrixWorld;
      const index = geom.index;
      const triLen = index ? index.count : pos.count;

      for (let t = 0; t < triLen; t += 3) {
        totalTri++;
        const a = index ? index.getX(t) : t;
        const b = index ? index.getX(t + 1) : t + 1;
        const c = index ? index.getX(t + 2) : t + 2;

        v.fromBufferAttribute(pos, a);
        w0.copy(v).applyMatrix4(mWorld);
        v.fromBufferAttribute(pos, b);
        w1.copy(v).applyMatrix4(mWorld);
        v.fromBufferAttribute(pos, c);
        w2.copy(v).applyMatrix4(mWorld);

        // Soft backface cull: drop only triangles that face very strongly
        // away from the camera. A gentle threshold keeps grazing-angle
        // triangles around silhouettes selectable.
        edge1.subVectors(w1, w0);
        edge2.subVectors(w2, w0);
        triNormal.crossVectors(edge1, edge2).normalize();
        toCam.subVectors(camPos, w0).normalize();
        if (triNormal.dot(toCam) < -0.15) continue;

        project(p0, w0);
        project(p1, w1);
        project(p2, w2);

        const u0x = uv.getX(a) * maskSize;
        const u0y = (1 - uv.getY(a)) * maskSize;
        const u1x = uv.getX(b) * maskSize;
        const u1y = (1 - uv.getY(b)) * maskSize;
        const u2x = uv.getX(c) * maskSize;
        const u2y = (1 - uv.getY(c)) * maskSize;

        const sxMin = Math.max(Math.floor(Math.min(p0.x, p1.x, p2.x, maxX)), minX);
        const sxMax = Math.min(Math.ceil(Math.max(p0.x, p1.x, p2.x, minX)), maxX);
        const syMin = Math.max(Math.floor(Math.min(p0.y, p1.y, p2.y, maxY)), minY);
        const syMax = Math.min(Math.ceil(Math.max(p0.y, p1.y, p2.y, minY)), maxY);
        const sampleStep = Math.max(3, Math.min(16, Math.ceil(Math.max(sxMax - sxMin, syMax - syMin) / 18)));
        let selectedSamples = 0;
        for (let sy = syMin; sy <= syMax; sy += sampleStep) {
          for (let sx = sxMin; sx <= sxMax; sx += sampleStep) {
            const sp = { x: sx + sampleStep * 0.5, y: sy + sampleStep * 0.5 };
            if (!inPoly(sp)) continue;
            const bc = barycentric(sp, p0, p1, p2);
            if (!bc || bc.a < -0.03 || bc.b < -0.03 || bc.c < -0.03) continue;
            const ux = bc.a * u0x + bc.b * u1x + bc.c * u2x;
            const uy = bc.a * u0y + bc.b * u1y + bc.c * u2y;
            mctx.beginPath();
            mctx.arc(ux, uy, Math.max(2.5, sampleStep * 0.5), 0, Math.PI * 2);
            mctx.fill();
            selectedSamples++;
          }
        }
        if (selectedSamples > 0) triCount++;
      }
    }

    if (triCount === 0) {
      onMask(activePart, "", 0);
      return;
    }

    // Slight feather so the UV-space mask edge isn't aliased on the model.
    const out = document.createElement("canvas");
    out.width = maskSize;
    out.height = maskSize;
    const octx = out.getContext("2d")!;
    octx.clearRect(0, 0, maskSize, maskSize);
    octx.filter = "blur(1.5px)";
    octx.drawImage(mc, 0, 0);
    onMask(activePart, out.toDataURL("image/png"), triCount);
    // unused but keeps tree-shaker honest
    void totalTri;
  }, [request, activePart, camera, scene, onMask, maskSize]);

  return null;
}
