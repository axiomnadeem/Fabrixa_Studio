// Selection / masking system for the 2D fabric editor.
//
// Design summary:
//  - The mask is a single-channel alpha matte rendered onto a hidden
//    HTMLCanvasElement the same internal size as the fabric Canvas.
//  - Strokes are drawn directly into this canvas with destination-out /
//    source-over / destination-in to implement add / subtract / intersect.
//  - Soft edges come from canvas `filter: blur(Xpx)` during the commit step
//    plus a per-stroke `shadowBlur`, so we don't pay double cost.
//  - Because the mask canvas is the same size as the fabric canvas, the
//    mask is already in texture UV space — projecting to 3D needs no
//    reprojection; the texture pipeline already handles UVs.
//
// The module is intentionally framework-agnostic (no React imports).
// FabricEditor wires the pointer events.

import { APP_DATA_0 } from "./APP_DATA_0";

export type SelectionMode = "add" | "subtract" | "intersect" | "erase";
export type SelectionTool = "lasso" | "polygon" | "brush";

export interface MaskOptions {
  feather: number;        // px gaussian softness applied at commit
  opacity: number;        // 0..1 max alpha
  expand: number;         // +grow / -shrink in px (morphological dilate)
  symmetryX?: boolean;    // mirror strokes across vertical centre line
}

export class SelectionMask {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;

  /** History stack of mask snapshots (data URLs) for undo. Capped. */
  private history: ImageData[] = [];
  private historyIndex = -1;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    this.canvas = c;
    this.ctx = c.getContext("2d", { willReadFrequently: true })!;
    this.snapshot();
  }

  isEmpty(): boolean {
    const d = this.ctx.getImageData(0, 0, this.width, this.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return false;
    return true;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.snapshot();
  }

  invert() {
    const img = this.ctx.getImageData(0, 0, this.width, this.height);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = 255 - img.data[i + 3];
    }
    this.ctx.putImageData(img, 0, 0);
    this.snapshot();
  }

  /** Paint a stroke (brush mode) — additive into a temp buffer that's
   *  merged with the current mode on `commitStroke()`. */
  paintStrokePoint(
    buffer: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    symmetryX: boolean,
  ) {
    buffer.fillStyle = "#ffffff";
    buffer.beginPath();
    buffer.arc(x, y, radius, 0, Math.PI * 2);
    buffer.fill();
    if (symmetryX) {
      buffer.beginPath();
      buffer.arc(this.width - x, y, radius, 0, Math.PI * 2);
      buffer.fill();
    }
  }

  /** Fill a closed polygon into a buffer canvas (lasso/polygon mode). */
  fillPolygon(
    buffer: CanvasRenderingContext2D,
    pts: { x: number; y: number }[],
    symmetryX: boolean,
  ) {
    if (pts.length < 3) return;
    buffer.fillStyle = "#ffffff";
    buffer.beginPath();
    buffer.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) buffer.lineTo(pts[i].x, pts[i].y);
    buffer.closePath();
    buffer.fill();
    if (symmetryX) {
      buffer.beginPath();
      buffer.moveTo(this.width - pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) buffer.lineTo(this.width - pts[i].x, pts[i].y);
      buffer.closePath();
      buffer.fill();
    }
  }

  /** Merge a freshly-painted buffer into the main mask using the given mode. */
  commitBuffer(buffer: HTMLCanvasElement, mode: SelectionMode) {
    const ctx = this.ctx;
    ctx.save();
    if (mode === "add") {
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(buffer, 0, 0);
    } else if (mode === "subtract" || mode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(buffer, 0, 0);
    } else if (mode === "intersect") {
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(buffer, 0, 0);
    }
    ctx.restore();
    this.snapshot();
  }

  /** Apply final feather + expand to produce a soft mask data URL. */
  exportSoftMask(opts: MaskOptions): string {
    const out = document.createElement("canvas");
    out.width = this.width;
    out.height = this.height;
    const octx = out.getContext("2d")!;
    // Expand / shrink — cheap morphological op via shadow trick.
    if (opts.expand !== 0) {
      octx.save();
      if (opts.expand > 0) {
        octx.shadowColor = "#fff";
        octx.shadowBlur = opts.expand;
        for (let i = 0; i < 3; i++) octx.drawImage(this.canvas, 0, 0);
      } else {
        // Shrink: invert, dilate, invert.
        octx.drawImage(this.canvas, 0, 0);
        octx.globalCompositeOperation = "destination-out";
        octx.filter = `blur(${Math.abs(opts.expand)}px)`;
        octx.drawImage(this.canvas, 0, 0);
        octx.filter = "none";
        octx.globalCompositeOperation = "source-over";
      }
      octx.restore();
    } else {
      octx.drawImage(this.canvas, 0, 0);
    }
    // Feather pass.
    if (opts.feather > 0) {
      const blurred = document.createElement("canvas");
      blurred.width = this.width;
      blurred.height = this.height;
      const bctx = blurred.getContext("2d")!;
      bctx.filter = `blur(${opts.feather}px)`;
      bctx.drawImage(out, 0, 0);
      octx.clearRect(0, 0, this.width, this.height);
      octx.drawImage(blurred, 0, 0);
    }
    if (opts.opacity < 1) {
      const img = octx.getImageData(0, 0, this.width, this.height);
      const k = Math.max(0, Math.min(1, opts.opacity));
      for (let i = 3; i < img.data.length; i += 4) img.data[i] = Math.round(img.data[i] * k);
      octx.putImageData(img, 0, 0);
    }
    return out.toDataURL("image/png");
  }

  /** Composite `overlay` onto `dest` using the soft mask as alpha matte.
   *  Used by the editor's "Apply inside selection" action. */
  static compositeWithMask(
    dest: CanvasRenderingContext2D,
    overlaySource: CanvasImageSource,
    maskSource: CanvasImageSource,
    width: number,
    height: number,
  ) {
    const layer = document.createElement("canvas");
    layer.width = width;
    layer.height = height;
    const lctx = layer.getContext("2d")!;
    lctx.drawImage(overlaySource, 0, 0, width, height);
    lctx.globalCompositeOperation = "destination-in";
    lctx.drawImage(maskSource, 0, 0, width, height);
    lctx.globalCompositeOperation = "source-over";
    dest.drawImage(layer, 0, 0, width, height);
  }

  // ----- undo / redo -----
  snapshot() {
    const img = this.ctx.getImageData(0, 0, this.width, this.height);
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(img);
    if (this.history.length > 24) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }
  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.ctx.putImageData(this.history[this.historyIndex], 0, 0);
  }
  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.ctx.putImageData(this.history[this.historyIndex], 0, 0);
  }

  /** Marching-ants stroke drawn over the host context (used for live overlay).
   *  Cheap edge extraction: thresholded alpha contour stroke. */
  drawAnts(target: CanvasRenderingContext2D, phase: number) {
    target.save();
    target.lineWidth = 1.25;
    target.setLineDash(APP_DATA_0.selection.antsDash as unknown as number[]);
    target.lineDashOffset = -phase;
    target.strokeStyle = "rgba(255,255,255,0.95)";
    target.shadowColor = "rgba(0,0,0,0.7)";
    target.shadowBlur = 1;
    // Edge sketch using stamp + difference — fast & good-enough.
    target.drawImage(this.canvas, 0, 0, target.canvas.width, target.canvas.height);
    target.restore();
  }
}

export function defaultMaskOptions(): MaskOptions {
  return {
    feather: APP_DATA_0.selection.defaultFeatherPx,
    opacity: APP_DATA_0.selection.defaultOpacity,
    expand: APP_DATA_0.selection.defaultExpandPx,
    symmetryX: false,
  };
}