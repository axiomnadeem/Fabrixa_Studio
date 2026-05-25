// One-click textile presets — patterns and gradients for the 2D editor.

export interface PatternPreset {
  id: string;
  label: string;
  // SVG generator returning a tileable square pattern
  svg: (color: string, bg: string) => string;
}

const wrap = (size: number, body: string, bg: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="${bg}"/>${body}</svg>`;

export const PATTERN_PRESETS: PatternPreset[] = [
  {
    id: "polka",
    label: "Polka",
    svg: (c, bg) => wrap(80, `<circle cx="20" cy="20" r="6" fill="${c}"/><circle cx="60" cy="60" r="6" fill="${c}"/>`, bg),
  },
  {
    id: "stripes",
    label: "Stripes",
    svg: (c, bg) => wrap(40, `<rect x="0" y="0" width="20" height="40" fill="${c}"/>`, bg),
  },
  {
    id: "checks",
    label: "Checks",
    svg: (c, bg) => wrap(40, `<rect x="0" y="0" width="20" height="20" fill="${c}"/><rect x="20" y="20" width="20" height="20" fill="${c}"/>`, bg),
  },
  {
    id: "paisley",
    label: "Paisley",
    svg: (c, bg) => wrap(100, `<path d="M50 20 C70 20 80 40 70 60 C60 80 30 70 30 50 C30 35 40 20 50 20 Z" fill="${c}" opacity="0.85"/><circle cx="50" cy="45" r="6" fill="${bg}"/>`, bg),
  },
  {
    id: "floral",
    label: "Floral",
    svg: (c, bg) => wrap(80, `${[0, 72, 144, 216, 288].map(a => `<ellipse cx="40" cy="20" rx="6" ry="14" fill="${c}" transform="rotate(${a} 40 40)"/>`).join("")}<circle cx="40" cy="40" r="4" fill="${bg}"/>`, bg),
  },
  {
    id: "diamonds",
    label: "Diamonds",
    svg: (c, bg) => wrap(60, `<polygon points="30,5 55,30 30,55 5,30" fill="none" stroke="${c}" stroke-width="2"/>`, bg),
  },
  {
    id: "ikat",
    label: "Ikat",
    svg: (c, bg) => wrap(60, `<rect x="10" y="10" width="40" height="6" fill="${c}"/><rect x="10" y="22" width="30" height="4" fill="${c}" opacity="0.7"/><rect x="10" y="34" width="40" height="6" fill="${c}"/><rect x="20" y="46" width="30" height="4" fill="${c}" opacity="0.7"/>`, bg),
  },
  {
    id: "chevron",
    label: "Chevron",
    svg: (c, bg) => wrap(60, `<polyline points="0,30 30,10 60,30" fill="none" stroke="${c}" stroke-width="6"/><polyline points="0,55 30,35 60,55" fill="none" stroke="${c}" stroke-width="6"/>`, bg),
  },
  // ----- Embroidery-style presets (stitched look) -----
{
  id: "embroidery-vine",
  label: "Embroidery Vine",
  svg: (c, bg) =>
    wrap(
      100,
      `
      <defs>
        <filter id="s">
          <feGaussianBlur stdDeviation="0.6"/>
        </filter>
      </defs>

      <path
        d="M10 80 Q30 40 50 60 T90 30"
        fill="none"
        stroke="${c}"
        stroke-width="3"
        stroke-dasharray="4 3"
        stroke-linecap="round"
      />

      <circle cx="30" cy="55" r="4" fill="${c}" />
      <circle cx="55" cy="55" r="3" fill="${c}" opacity="0.8" />
      <circle cx="78" cy="40" r="4" fill="${c}" />
      `,
      bg
    ),
},
  {
    id: "embroidery-cross",
    label: "Cross Stitch",
    svg: (c, bg) => wrap(40, `<g stroke="${c}" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="14" y2="14"/><line x1="14" y1="6" x2="6" y2="14"/><line x1="26" y1="26" x2="34" y2="34"/><line x1="34" y1="26" x2="26" y2="34"/></g>`, bg),
  },
  {
    id: "embroidery-bead",
    label: "Beadwork",
    svg: (c, bg) => wrap(50, `<g><circle cx="12" cy="12" r="3" fill="${c}"/><circle cx="12" cy="11" r="1" fill="white" opacity="0.7"/><circle cx="38" cy="12" r="3" fill="${c}"/><circle cx="25" cy="25" r="3.5" fill="${c}"/><circle cx="12" cy="38" r="3" fill="${c}"/><circle cx="38" cy="38" r="3" fill="${c}"/></g>`, bg),
  },
  {
    id: "embroidery-zardosi",
    label: "Zardosi",
    svg: (c, bg) => wrap(80, `<g stroke="${c}" stroke-width="2" fill="none"><circle cx="40" cy="40" r="18" stroke-dasharray="3 2"/><circle cx="40" cy="40" r="10" stroke-dasharray="2 2"/></g><circle cx="40" cy="40" r="4" fill="${c}"/>`, bg),
  },
];

export const patternToDataUrl = (p: PatternPreset, color: string, bg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(p.svg(color, bg))}`;

import { PATTERN_PRESETS_MORE } from "./patternPresetsExtended";

export const ALL_PATTERN_PRESETS: PatternPreset[] = [
  ...PATTERN_PRESETS,
  ...PATTERN_PRESETS_MORE,
];

export interface GradientPreset {
  id: string;
  label: string;
  stops: { offset: number; color: string }[];
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "sunset", label: "Sunset", stops: [{ offset: 0, color: "#ff9966" }, { offset: 1, color: "#ff5e62" }] },
  { id: "royal", label: "Royal", stops: [{ offset: 0, color: "#5b247a" }, { offset: 1, color: "#1bcedf" }] },
  { id: "rose", label: "Rose Gold", stops: [{ offset: 0, color: "#f7c5cc" }, { offset: 1, color: "#b76e79" }] },
  { id: "emerald", label: "Emerald", stops: [{ offset: 0, color: "#11998e" }, { offset: 1, color: "#38ef7d" }] },
  { id: "violet", label: "Violet", stops: [{ offset: 0, color: "#7e3c8c" }, { offset: 1, color: "#c44569" }] },
  { id: "ocean", label: "Ocean", stops: [{ offset: 0, color: "#2c3e50" }, { offset: 1, color: "#4ca1af" }] },
];
