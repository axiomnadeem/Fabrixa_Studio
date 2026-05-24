/** Maps garment model filenames (incl. spaces) to bundled Vite URLs. */
const GLB_URLS = import.meta.glob<string>(
  "../../assets/models/*.glb",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

export function normalizeModelKey(name: string): string {
  return name
    .replace(/^.*\//, "")
    .replace(/\.glb$/i, "")
    .trim()
    .toLowerCase();
}

export function listBundledModelKeys(): string[] {
  return Object.keys(GLB_URLS).map((p) => normalizeModelKey(p.split("/").pop() ?? ""));
}

export function resolveBundledGlbUrl(modelPathOrFile: string): string | null {
  const wanted = normalizeModelKey(modelPathOrFile);
  const wantedCompact = wanted.replace(/\s+/g, "");

  for (const [k, v] of Object.entries(GLB_URLS)) {
    const base = normalizeModelKey(k.split("/").pop() ?? "");
    if (base === wanted) return v;
    if (base.replace(/\s+/g, "") === wantedCompact) return v;
  }
  return null;
}
