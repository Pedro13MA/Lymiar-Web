/**
 * FASE 7.3/7.4 — helpers taxonomyFacets + deep-link de filtros.
 */

import type { TaxonomyFacet, TaxonomyFacetType, TaxonomyFacetValue } from "@/lib/api";

/** facetId → valores selecionados (multi). */
export type TaxonomySelection = Record<string, string[]>;

/** Params URL suportados pelo TaxonomyFilterEngine (hub FASE 7.4). */
export const TAXONOMY_FILTER_IDS: readonly string[] = [
  "brand",
  "store",
  "condition",
  "manufacturer",
  "socket",
  "chipset",
  "series",
  "model",
  "cpu_model",
  "gpu_model",
  "memory_type",
  "ram_type",
  "panel",
  "resolution",
  "interface",
  "form_factor",
  "platform",
  "edition",
  "format",
  "color",
  "network_gen",
  "adaptive_sync",
  "vram_gb",
  "memory_gb",
  "ram_gb",
  "capacity_gb",
  "storage_gb",
  "refresh_rate",
  "refresh_hz",
  "screen_size",
  "screen_size_in",
  "size_in",
  "power_w",
  "cores",
  "threads",
  "wifi",
  "bluetooth",
  "rgb",
  "touchscreen",
  "wireless",
  "price_min",
  "price_max",
  "capacity_min",
  "capacity_max",
  "memory_min",
  "memory_max",
  "refresh_min",
  "refresh_max",
] as const;

export function hasTaxonomyFacets(
  facets: TaxonomyFacet[] | null | undefined,
): boolean {
  return Array.isArray(facets) && facets.some((f) => (f.values?.length ?? 0) > 0);
}

/** Facets não vazias — preserva ordem da API (specs → marca/loja). */
export function prepareTaxonomyFacets(
  facets: TaxonomyFacet[] | null | undefined,
): TaxonomyFacet[] {
  if (!facets?.length) return [];
  return facets
    .filter((f) => f && f.id && (f.values?.length ?? 0) > 0)
    .map((f) => ({
      ...f,
      values: sortFacetValues(f.type, f.values),
    }));
}

export function sortFacetValues(
  type: string | undefined,
  values: TaxonomyFacetValue[],
): TaxonomyFacetValue[] {
  if (!values?.length) return [];
  const t = (type || "enum").toLowerCase();
  if (t === "number" || t === "range") {
    return [...values].sort((a, b) => {
      const na = Number(a.value);
      const nb = Number(b.value);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, "pt", { sensitivity: "base" });
    });
  }
  return [...values].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label, "pt", { sensitivity: "base" });
  });
}

export function normalizeFacetType(type: string | undefined): TaxonomyFacetType {
  const t = (type || "enum").toLowerCase();
  if (t === "number" || t === "boolean" || t === "range" || t === "enum") {
    return t;
  }
  return "enum";
}

export function isValueSelected(
  selection: TaxonomySelection,
  facetId: string,
  value: string,
): boolean {
  const cur = selection[facetId];
  if (!cur?.length) return false;
  const want = value.toLowerCase();
  return cur.some((v) => v.toLowerCase() === want);
}

export function toggleFacetValue(
  selection: TaxonomySelection,
  facetId: string,
  value: string,
): TaxonomySelection {
  const cur = selection[facetId] ?? [];
  const want = value.toLowerCase();
  const exists = cur.some((v) => v.toLowerCase() === want);
  const nextValues = exists
    ? cur.filter((v) => v.toLowerCase() !== want)
    : [...cur, value];
  const next = { ...selection };
  if (nextValues.length === 0) {
    delete next[facetId];
  } else {
    next[facetId] = nextValues;
  }
  return next;
}

export function setBooleanFacet(
  selection: TaxonomySelection,
  facetId: string,
  on: boolean,
  trueValue = "true",
): TaxonomySelection {
  const next = { ...selection };
  if (on) {
    next[facetId] = [trueValue];
  } else {
    delete next[facetId];
  }
  return next;
}

export function clearTaxonomySelection(): TaxonomySelection {
  return {};
}

export function countSelected(selection: TaxonomySelection): number {
  return Object.values(selection).reduce((n, vals) => n + vals.length, 0);
}

/** Serializa seleção para query params (`?brand=asus&vram_gb=16`). */
export function selectionToSearchParams(
  selection: TaxonomySelection,
): URLSearchParams {
  const params = new URLSearchParams();
  appendSelectionToParams(params, selection);
  return params;
}

/** Acrescenta filtros taxonomy a params existentes (multi-value). */
export function appendSelectionToParams(
  params: URLSearchParams,
  selection: TaxonomySelection,
): void {
  for (const id of TAXONOMY_FILTER_IDS) {
    params.delete(id);
  }
  for (const [id, values] of Object.entries(selection)) {
    if (!TAXONOMY_FILTER_IDS.includes(id)) continue;
    for (const v of values) {
      if (v) params.append(id, v);
    }
  }
}

/** Lê seleção a partir de URL (multi-value por facet id). */
export function selectionFromSearchParams(
  params: URLSearchParams,
  knownFacetIds: readonly string[] = TAXONOMY_FILTER_IDS,
): TaxonomySelection {
  const out: TaxonomySelection = {};
  for (const id of knownFacetIds) {
    const all = params.getAll(id);
    if (all.length) {
      out[id] = all.filter(Boolean);
    }
  }
  return out;
}

/** URL legada `min_price`/`max_price` → taxonomy `price_min`/`price_max`. */
export function selectionFromSearchParamsWithLegacy(
  params: URLSearchParams,
  knownFacetIds: readonly string[] = TAXONOMY_FILTER_IDS,
): TaxonomySelection {
  const out = selectionFromSearchParams(params, knownFacetIds);
  const min = (params.get("price_min") || params.get("min_price") || "").trim();
  const max = (params.get("price_max") || params.get("max_price") || "").trim();
  if (min && !out.price_min?.length) out.price_min = [min];
  if (max && !out.price_max?.length) out.price_max = [max];
  return out;
}

const EXPANDED_PREFIX = "lymiar.taxonomyFacet.expanded.";

export function readFacetExpanded(facetId: string, fallback = true): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(EXPANDED_PREFIX + facetId);
    if (raw === null) return fallback;
    return raw === "1";
  } catch {
    return fallback;
  }
}

export function writeFacetExpanded(facetId: string, expanded: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EXPANDED_PREFIX + facetId, expanded ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function formatFacetValueLabel(
  _type: string | undefined,
  value: TaxonomyFacetValue,
): string {
  if (value.label && value.label !== value.value) {
    return value.label;
  }
  const raw = value.label || value.value;
  const condMap: Record<string, string> = {
    NEW: "Novo",
    OUTLET: "Outlet",
    OPEN_BOX: "Caixa aberta",
    REFURBISHED: "Recondicionado",
  };
  if (condMap[raw.toUpperCase()]) {
    return condMap[raw.toUpperCase()];
  }
  return raw;
}

/** Facet ids handled by the dedicated price inputs (not enum panels). */
export const PRICE_INPUT_FACET_IDS = new Set(["price_min", "price_max"]);

const FACET_CHIP_PREFIX: Record<string, string> = {
  brand: "Marca",
  store: "Loja",
  condition: "Estado",
  manufacturer: "Fabricante",
  socket: "Socket",
  chipset: "Chipset",
  series: "Série",
  model: "Modelo",
  cpu_model: "CPU",
  gpu_model: "GPU",
  memory_type: "Tipo memória",
  ram_type: "Tipo RAM",
  panel: "Painel",
  resolution: "Resolução",
  vram_gb: "VRAM",
  memory_gb: "RAM",
  ram_gb: "RAM",
  capacity_gb: "Capacidade",
  storage_gb: "Armazenamento",
  refresh_rate: "Hz",
  refresh_hz: "Hz",
  screen_size: "Ecrã",
  screen_size_in: "Ecrã",
  power_w: "Potência",
  cores: "Núcleos",
  threads: "Threads",
};

export type ActiveFilterChip = {
  key: string;
  label: string;
  facetId: string;
  value: string;
};

/** Build removable chips from the current taxonomy selection (+ optional query). */
export function buildActiveFilterChips(
  selection: TaxonomySelection,
  facets: TaxonomyFacet[] | null | undefined,
  opts?: { q?: string },
): ActiveFilterChip[] {
  const list: ActiveFilterChip[] = [];
  const q = (opts?.q || "").trim();
  if (q) {
    list.push({ key: "q", label: `Pesquisa: «${q}»`, facetId: "q", value: q });
  }

  const facetById = new Map((facets || []).map((f) => [f.id, f]));

  for (const [fid, values] of Object.entries(selection)) {
    if (!values?.length) continue;
    const facet = facetById.get(fid);
    const prefix = FACET_CHIP_PREFIX[fid] || facet?.label || fid;

    if (fid === "price_min") {
      list.push({
        key: `price_min:${values[0]}`,
        label: `≥ ${values[0]} €`,
        facetId: fid,
        value: values[0],
      });
      continue;
    }
    if (fid === "price_max") {
      list.push({
        key: `price_max:${values[0]}`,
        label: `≤ ${values[0]} €`,
        facetId: fid,
        value: values[0],
      });
      continue;
    }

    for (const v of values) {
      const match = facet?.values.find(
        (x) => x.value.toLowerCase() === v.toLowerCase(),
      );
      const valueLabel = match
        ? formatFacetValueLabel(facet?.type, match)
        : v;
      list.push({
        key: `${fid}:${v}`,
        label: `${prefix}: ${valueLabel}`,
        facetId: fid,
        value: v,
      });
    }
  }
  return list;
}

export function removeActiveFilterChip(
  selection: TaxonomySelection,
  chip: Pick<ActiveFilterChip, "facetId" | "value">,
): TaxonomySelection {
  if (chip.facetId === "q") return { ...selection };
  const next = { ...selection };
  const cur = next[chip.facetId] || [];
  const filtered = cur.filter(
    (x) => x.toLowerCase() !== chip.value.toLowerCase(),
  );
  if (filtered.length) next[chip.facetId] = filtered;
  else delete next[chip.facetId];
  return next;
}

/** Merge price draft into selection (source of truth for URL). */
export function withPriceSelection(
  selection: TaxonomySelection,
  minPrice?: string | null,
  maxPrice?: string | null,
): TaxonomySelection {
  const next = { ...selection };
  if (minPrice !== undefined && minPrice !== null) {
    const v = String(minPrice).trim();
    if (v) next.price_min = [v];
    else delete next.price_min;
  }
  if (maxPrice !== undefined && maxPrice !== null) {
    const v = String(maxPrice).trim();
    if (v) next.price_max = [v];
    else delete next.price_max;
  }
  return next;
}
