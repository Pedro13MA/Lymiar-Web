/**
 * FASE 7.10 / 8.5.1 — labels de apresentação (nunca "Other").
 * Leaf-first: taxonomy v2 antes de subcategory legacy.
 */

const OTHER_RE = /^(other|others|outro|outros|unknown|n\/?a|unmapped)$/i;
const UNUSABLE_LEAF =
  /^(unclassified|non_catalog|unmapped|other|outros)?$/i;

/** Labels PT alinhadas com taxonomy_nodes (v1.1). */
const LEAF_LABEL: Record<string, string> = {
  laptop: "Portáteis",
  desktop: "Desktops",
  gpu: "Placas Gráficas",
  cpu: "Processadores",
  ssd: "SSD",
  ram: "Memória RAM",
  motherboard: "Motherboards",
  monitor: "Monitores",
  smartphone: "Smartphones",
  tablet: "Tablets",
  smartwatch: "Smartwatches",
  console: "Consolas",
  game_physical: "Jogos Físicos",
  game_digital: "Jogos digitais",
  controller: "Comandos",
  mouse: "Ratos",
  keyboard: "Teclados",
  headphones: "Auscultadores",
  cable: "Cabos",
  charger: "Carregadores",
  fridge: "Frigoríficos",
  dishwasher: "Máquinas de Lavar Loiça",
  washing_machine: "Máquinas de Lavar",
  vacuum: "Aspiradores",
  printer: "Impressoras",
  informatica: "Informática",
  telemoveis: "Telemóveis",
  gaming: "Gaming",
  casa: "Casa",
  furniture: "Mobiliário",
  wall_mount: "Suportes de Parede TV",
  phone_accessory_other: "Outros Acessórios",
  gift_card_gaming: "Gift Cards Gaming",
  tv_audio: "TV e Áudio",
  fotografia: "Fotografia",
};

export function isOtherLabel(value: string | null | undefined): boolean {
  if (!value) return true;
  return OTHER_RE.test(value.trim());
}

/** Categoria / leaf legível — null se for Other ou vazia. */
export function displayCategoryLabel(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    const t = (c || "").trim();
    if (!t || isOtherLabel(t)) continue;
    return t.replace(/_/g, " ");
  }
  return null;
}

export function humanizeLeafId(leafId: string | null | undefined): string | null {
  const slug = (leafId || "").trim().toLowerCase();
  if (!slug || UNUSABLE_LEAF.test(slug)) return null;
  return LEAF_LABEL[slug] || slug.replace(/_/g, " ");
}

export function displayLeafOrBrand(opts: {
  subcategoryLabel?: string | null;
  leafId?: string | null;
  category?: string | null;
  brand?: string | null;
  taxonomyPath?: string | string[] | null;
}): string | null {
  // FASE 8.5.1 — leaf utilizável: nunca preferir subcategory legacy (pode estar errada)
  const fromLeaf = humanizeLeafId(opts.leafId);
  if (fromLeaf) return fromLeaf;

  let pathLeaf: string | null = null;
  if (opts.taxonomyPath) {
    const parts = Array.isArray(opts.taxonomyPath)
      ? opts.taxonomyPath
      : (() => {
          const s = String(opts.taxonomyPath).trim();
          if (s.startsWith("[")) {
            try {
              const p = JSON.parse(s);
              return Array.isArray(p) ? p.map(String) : [];
            } catch {
              return [];
            }
          }
          return s.split(/[/>|,]/).map((x) => x.trim()).filter(Boolean);
        })();
    const last = parts[parts.length - 1];
    pathLeaf = humanizeLeafId(String(last || "")) || null;
  }
  if (pathLeaf) return pathLeaf;

  const legacy = displayCategoryLabel(opts.subcategoryLabel, opts.category);
  if (legacy) return legacy;
  const brand = (opts.brand || "").trim();
  return brand || null;
}

/** Poupança vs média 30d ou vs máximo — só se positiva. */
export function computeSavingsEur(opts: {
  current: number;
  avg30d?: number | null;
  historicalMax?: number | null;
  originalPrice?: number | null;
}): number | null {
  const candidates: number[] = [];
  if (opts.originalPrice != null && opts.originalPrice > opts.current) {
    candidates.push(opts.originalPrice - opts.current);
  }
  if (opts.avg30d != null && opts.avg30d > opts.current) {
    candidates.push(opts.avg30d - opts.current);
  }
  if (opts.historicalMax != null && opts.historicalMax > opts.current) {
    const vsMax = opts.historicalMax - opts.current;
    if (vsMax / Math.max(opts.historicalMax, 1) >= 0.05) candidates.push(vsMax);
  }
  if (!candidates.length) return null;
  return Math.max(...candidates);
}
