// Additional vector pattern presets (shown under "More" in the 2D editor).
import { type PatternPreset } from "./presets";

const wrap = (size: number, body: string, bg: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="${bg}"/>${body}</svg>`;

export const PATTERN_PRESETS_MORE: PatternPreset[] = [
  { id: "dots-fine", label: "Fine Dots", svg: (c, bg) => wrap(24, `<circle cx="6" cy="6" r="2" fill="${c}"/><circle cx="18" cy="18" r="2" fill="${c}"/>`, bg) },
  { id: "dots-large", label: "Large Dots", svg: (c, bg) => wrap(48, `<circle cx="12" cy="12" r="8" fill="${c}"/><circle cx="36" cy="36" r="8" fill="${c}"/>`, bg) },
  { id: "hstripes", label: "H-Stripes", svg: (c, bg) => wrap(40, `<rect y="0" width="40" height="8" fill="${c}"/><rect y="20" width="40" height="8" fill="${c}"/>`, bg) },
  { id: "vstripes", label: "V-Stripes", svg: (c, bg) => wrap(40, `<rect x="0" width="8" height="40" fill="${c}"/><rect x="20" width="8" height="40" fill="${c}"/>`, bg) },
  { id: "grid", label: "Grid", svg: (c, bg) => wrap(40, `<path d="M0 20H40M20 0V40" stroke="${c}" stroke-width="1.5" fill="none"/>`, bg) },
  { id: "grid-bold", label: "Bold Grid", svg: (c, bg) => wrap(50, `<path d="M0 25H50M25 0V50" stroke="${c}" stroke-width="4" fill="none"/>`, bg) },
  { id: "zigzag", label: "Zigzag", svg: (c, bg) => wrap(48, `<polyline points="0,24 12,12 24,24 36,12 48,24" fill="none" stroke="${c}" stroke-width="4"/>`, bg) },
  { id: "waves", label: "Waves", svg: (c, bg) => wrap(60, `<path d="M0 30 Q15 10 30 30 T60 30" fill="none" stroke="${c}" stroke-width="3"/><path d="M0 45 Q15 25 30 45 T60 45" fill="none" stroke="${c}" stroke-width="3" opacity="0.6"/>`, bg) },
  { id: "scallop", label: "Scallop", svg: (c, bg) => wrap(48, `<path d="M0 24 Q12 0 24 24 T48 24" fill="none" stroke="${c}" stroke-width="3"/>`, bg) },
  { id: "hex", label: "Hexagon", svg: (c, bg) => wrap(56, `<polygon points="28,4 52,16 52,40 28,52 4,40 4,16" fill="none" stroke="${c}" stroke-width="2"/>`, bg) },
  { id: "honeycomb", label: "Honeycomb", svg: (c, bg) => wrap(60, `<polygon points="15,10 25,10 30,20 25,30 15,30 10,20" fill="none" stroke="${c}" stroke-width="2"/><polygon points="35,30 45,30 50,40 45,50 35,50 30,40" fill="none" stroke="${c}" stroke-width="2"/>`, bg) },
  { id: "triangles", label: "Triangles", svg: (c, bg) => wrap(40, `<polygon points="20,5 35,35 5,35" fill="${c}"/><polygon points="20,5 35,35 5,35" fill="${c}" transform="translate(20,0)"/>`, bg) },
  { id: "stars", label: "Stars", svg: (c, bg) => wrap(50, `<polygon points="25,5 30,20 45,20 33,30 38,45 25,36 12,45 17,30 5,20 20,20" fill="${c}" transform="scale(0.5) translate(25,25)"/>`, bg) },
  { id: "star-tile", label: "Star Tile", svg: (c, bg) => wrap(40, `<text x="8" y="28" font-size="20" fill="${c}">✦</text><text x="28" y="28" font-size="20" fill="${c}">✦</text>`, bg) },
  { id: "leaves", label: "Leaves", svg: (c, bg) => wrap(60, `<ellipse cx="20" cy="30" rx="12" ry="6" fill="${c}" transform="rotate(-35 20 30)"/><ellipse cx="40" cy="20" rx="12" ry="6" fill="${c}" transform="rotate(25 40 20)"/>`, bg) },
  { id: "vine-scroll", label: "Vine Scroll", svg: (c, bg) => wrap(80, `<path d="M10 70 Q40 10 70 40" fill="none" stroke="${c}" stroke-width="2.5"/><circle cx="40" cy="35" r="5" fill="${c}"/>`, bg) },
  { id: "mandala", label: "Mandala", svg: (c, bg) => wrap(80, `<circle cx="40" cy="40" r="30" fill="none" stroke="${c}" stroke-width="1.5"/><circle cx="40" cy="40" r="18" fill="none" stroke="${c}" stroke-width="1.5"/><circle cx="40" cy="40" r="6" fill="${c}"/>`, bg) },
  { id: "block-print", label: "Block Print", svg: (c, bg) => wrap(50, `<rect x="5" y="5" width="18" height="18" fill="${c}" opacity="0.9"/><rect x="27" y="27" width="18" height="18" fill="${c}" opacity="0.7"/>`, bg) },
  { id: "ikat-bold", label: "Ikat Bold", svg: (c, bg) => wrap(60, `<rect x="8" y="15" width="44" height="8" fill="${c}"/><rect x="12" y="30" width="36" height="6" fill="${c}" opacity="0.75"/><rect x="8" y="42" width="44" height="8" fill="${c}"/>`, bg) },
  { id: "basket", label: "Basket Weave", svg: (c, bg) => wrap(40, `<rect x="0" y="0" width="20" height="20" fill="${c}"/><rect x="20" y="20" width="20" height="20" fill="${c}"/><rect x="20" y="0" width="20" height="20" fill="none" stroke="${c}" stroke-width="2"/><rect x="0" y="20" width="20" height="20" fill="none" stroke="${c}" stroke-width="2"/>`, bg) },
  { id: "herringbone", label: "Herringbone", svg: (c, bg) => wrap(40, `<path d="M0 20 L10 0 L20 20 L30 0 L40 20" fill="none" stroke="${c}" stroke-width="3"/><path d="M0 40 L10 20 L20 40 L30 20 L40 40" fill="none" stroke="${c}" stroke-width="3"/>`, bg) },
  { id: "tweed", label: "Tweed", svg: (c, bg) => wrap(30, `<rect width="30" height="30" fill="${bg}"/><circle cx="8" cy="8" r="2" fill="${c}"/><circle cx="22" cy="14" r="2" fill="${c}"/><circle cx="12" cy="24" r="2" fill="${c}"/><rect x="18" y="20" width="6" height="2" fill="${c}"/>`, bg) },
  { id: "plaid", label: "Plaid", svg: (c, bg) => wrap(60, `<path d="M0 20H60M0 40H60M20 0V60M40 0V60" stroke="${c}" stroke-width="3" opacity="0.5"/><path d="M0 30H60M30 0V60" stroke="${c}" stroke-width="6" opacity="0.35"/>`, bg) },
  { id: "tartan", label: "Tartan", svg: (c, bg) => wrap(80, `<rect width="80" height="80" fill="${bg}"/><path d="M0 40H80M40 0V80" stroke="${c}" stroke-width="12" opacity="0.4"/><path d="M0 40H80M40 0V80" stroke="${c}" stroke-width="4"/>`, bg) },
  { id: "arrow", label: "Arrows", svg: (c, bg) => wrap(48, `<path d="M8 24 H32 M28 18 L36 24 L28 30" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`, bg) },
  { id: "feather", label: "Feather", svg: (c, bg) => wrap(50, `<path d="M25 5 Q35 25 25 45 Q15 25 25 5" fill="none" stroke="${c}" stroke-width="2"/><line x1="25" y1="10" x2="25" y2="42" stroke="${c}" stroke-width="1"/>`, bg) },
  { id: "chain", label: "Chain", svg: (c, bg) => wrap(44, `<ellipse cx="22" cy="12" rx="10" ry="6" fill="none" stroke="${c}" stroke-width="2.5"/><ellipse cx="22" cy="32" rx="10" ry="6" fill="none" stroke="${c}" stroke-width="2.5"/>`, bg) },
  { id: "spiral", label: "Spiral", svg: (c, bg) => wrap(60, `<path d="M30 30 Q38 22 30 14 Q18 14 18 26 Q18 38 32 38 Q46 38 46 22" fill="none" stroke="${c}" stroke-width="2.5"/>`, bg) },
  { id: "moroccan", label: "Moroccan", svg: (c, bg) => wrap(50, `<path d="M25 5 L35 15 L25 25 L15 15 Z M25 25 L35 35 L25 45 L15 35 Z" fill="none" stroke="${c}" stroke-width="2"/>`, bg) },
  { id: "art-deco", label: "Art Deco", svg: (c, bg) => wrap(60, `<path d="M30 5 L55 30 L30 55 L5 30 Z" fill="none" stroke="${c}" stroke-width="2"/><circle cx="30" cy="30" r="8" fill="${c}"/>`, bg) },
  { id: "brushstroke", label: "Brushstroke", svg: (c, bg) => wrap(70, `<path d="M10 50 Q35 20 60 45" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" opacity="0.85"/>`, bg) },
];
