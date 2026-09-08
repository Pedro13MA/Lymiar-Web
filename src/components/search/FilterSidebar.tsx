"use client";

import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { TaxonomyFilters } from "@/components/search/TaxonomyFilters";
import type { FacetBucket, SearchFacets, TaxonomyFacet } from "@/lib/api";
import {
  clearTaxonomySelection,
  hasTaxonomyFacets,
  PRICE_INPUT_FACET_IDS,
  type TaxonomySelection,
} from "@/lib/taxonomy-facets";
import { storeDisplayName } from "@/lib/storeLogos";
import { cn } from "@/lib/utils";

const BRAND_PREVIEW = 8;

export type FilterValues = {
  category: string;
  subcategory: string;
  brand: string;
  store: string;
  type: string;
  model: string;
  vram: string;
  series: string;
  socket: string;
  capacity: string;
  format: string;
  minPrice: string;
  maxPrice: string;
  inStockOnly: boolean;
};

const SUBCATEGORY_FILTER_KEY: Record<string, string> = {
  "placas gráficas": "gpu",
  "processadores / cpus": "cpu",
  "processadores": "cpu",
  "armazenamento": "ssd",
  "armazenamento ssd": "ssd",
  "ssd": "ssd",
  "ram / memória": "ram",
  "memória ram": "ram",
  "air fryers": "air_fryer",
  "smartphones": "smartphone",
  "portáteis": "laptop",
  "desktops": "desktop",
  "computadores de secretária": "desktop",
  "motherboards / placas-mãe": "motherboard",
  "motherboards": "motherboard",
  "monitores & ecrãs": "monitor",
  "monitores": "monitor",
  "fontes de alimentação (psu)": "psu",
  "periféricos": "peripheral",
  "componentes de rede": "network",
  "redes": "network",
  "consolas": "console",
  "jogos": "game_physical",
  "comandos": "controller",
  "tablets": "tablet",
  "smartwatches": "smartwatch",
  "acessórios": "accessory",
};

/** Leaf slugs + legacy keys used to drive typed facet blocks. */
const KNOWN_NAV_KEYS = new Set([
  "gpu",
  "cpu",
  "ssd",
  "ram",
  "air_fryer",
  "smartphone",
  "laptop",
  "desktop",
  "motherboard",
  "monitor",
  "psu",
  "peripheral",
  "network",
  "console",
  "accessory",
  "game_physical",
  "game_digital",
  "controller",
  "tablet",
  "smartwatch",
  "mouse",
  "keyboard",
  "fridge",
  "dishwasher",
  "washing_machine",
  "vacuum",
]);

function resolveActiveCategoryKey(
  subcategory: string,
  inferredCategory?: string | null,
): string {
  // FASE 8.5.1 — valor do filtro é preferencialmente leaf_id
  const raw = (subcategory || inferredCategory || "").trim();
  if (!raw) return "";
  const low = raw.toLowerCase();
  if (SUBCATEGORY_FILTER_KEY[low]) return SUBCATEGORY_FILTER_KEY[low];
  if (KNOWN_NAV_KEYS.has(low)) return low;
  return low;
}

type Props = {
  facets: SearchFacets;
  /** FASE 7.3 — se presente e não vazio, substitui blocos hardcoded por UI dinâmica */
  taxonomyFacets?: TaxonomyFacet[];
  taxonomySelection?: TaxonomySelection;
  onTaxonomySelectionChange?: (next: TaxonomySelection) => void;
  filters: FilterValues;
  inferredCategory?: string | null;
  minDraft: string;
  maxDraft: string;
  onMinDraft: (v: string) => void;
  onMaxDraft: (v: string) => void;
  onSelect: (patch: Partial<FilterValues>) => void;
  onClear: () => void;
  onApplyPrice: () => void;
  /** Category page cannot filter stock yet — hide fake control. Default true (search). */
  showInStock?: boolean;
  /** Esconde bloco de subcategoria (navegação por URL, não filtro). */
  hideSubcategoryFilter?: boolean;
  /** Dentro do painel lateral da categoria — sem borda/sticky duplicado. */
  embedded?: boolean;
};

function FacetList({
  title,
  items,
  active,
  onSelect,
  collapsible,
  itemKey,
}: {
  title: string;
  items: FacetBucket[];
  active: string;
  onSelect: (value: string) => void;
  collapsible?: boolean;
  itemKey?: (item: FacetBucket) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!items?.length) return null;

  const visible =
    collapsible && !expanded && items.length > BRAND_PREVIEW
      ? items.slice(0, BRAND_PREVIEW)
      : items;
  const hiddenCount = Math.max(0, items.length - BRAND_PREVIEW);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hm-faint,#8b9aab)]">
        {title}
      </p>
      <ul className="space-y-1">
        {visible.map((item) => {
          const selected = active.toLowerCase() === item.value.toLowerCase();
          const key = itemKey ? itemKey(item) : item.value;
          const label =
            title === "Loja"
              ? storeDisplayName(item.value, item.label)
              : item.label;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onSelect(selected ? "" : item.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                  selected
                    ? "bg-[var(--hm-brand-soft,#fff1e8)] font-medium text-[var(--hm-brand-deep,#e2550f)]"
                    : "text-[var(--hm-ink,#0b1220)] hover:bg-[var(--hm-bg-soft,#eef2f6)]",
                )}
              >
                <span className="truncate">{label}</span>
                <span className="ml-2 shrink-0 text-xs text-[var(--hm-faint,#8b9aab)]">
                  ({item.count})
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {collapsible && hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-[var(--hm-brand-deep,#e2550f)] hover:underline"
        >
          {expanded ? "Ver menos" : `Ver mais (+${hiddenCount})`}
        </button>
      ) : null}
    </div>
  );
}

function SubcategoryBlock({
  items,
  active,
  onSelect,
}: {
  items: FacetBucket[];
  active: string;
  onSelect: (value: string) => void;
}) {
  if (!items.length) return null;

  return (
    <div className="space-y-2 rounded-xl border border-[var(--hm-line,#dde3ea)] bg-[var(--hm-brand-soft,#fff1e8)]/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hm-brand-deep,#e2550f)]">
        Categoria
      </p>
      <p className="text-[11px] text-[var(--hm-muted,#5b6b7c)]">
        Taxonomia Lymiar (leaf) · fallback legado se necessário
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const selected = active.toLowerCase() === item.value.toLowerCase();
          const key = `${item.value}::${item.label}`;
          return (
            <li key={key}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(selected ? "" : item.value)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                  selected
                    ? "bg-white font-medium text-[var(--hm-ink,#0b1220)] shadow-sm ring-1 ring-[var(--hm-brand,#ff6a1a)]/30"
                    : "text-[var(--hm-ink,#0b1220)] hover:bg-white/70",
                )}
              >
                <span className="truncate">{item.label}</span>
                <span className="shrink-0 text-xs text-[var(--hm-faint,#8b9aab)]">
                  ({item.count})
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LegacyCategoryFacets({
  facets,
  filters,
  inferredCategory,
  onSelect,
}: {
  facets: SearchFacets;
  filters: FilterValues;
  inferredCategory?: string | null;
  onSelect: (patch: Partial<FilterValues>) => void;
}) {
  const cat = resolveActiveCategoryKey(filters.subcategory, inferredCategory);
  const isGpu = cat === "gpu";
  const isCpu = cat === "cpu";
  const isSsd = cat === "ssd";
  const isRam = cat === "ram";
  const isAirFryer = cat === "air_fryer";
  const isSmartphone = cat === "smartphone";

  return (
    <>
      {isGpu ? (
        <>
          <FacetList
            title="Modelo / Chipset"
            items={facets.models || []}
            active={filters.model}
            onSelect={(value) => onSelect({ model: value, type: "" })}
            collapsible
          />
          <FacetList
            title="Memória VRAM"
            items={facets.vram || []}
            active={filters.vram}
            onSelect={(value) => onSelect({ vram: value })}
          />
        </>
      ) : null}

      {isCpu ? (
        <>
          <FacetList
            title="Série"
            items={facets.series || []}
            active={filters.series}
            onSelect={(value) => onSelect({ series: value })}
          />
          <FacetList
            title="Socket"
            items={facets.sockets || []}
            active={filters.socket}
            onSelect={(value) => onSelect({ socket: value })}
          />
        </>
      ) : null}

      {isSsd || isRam ? (
        <>
          <FacetList
            title="Capacidade"
            items={facets.capacities || []}
            active={filters.capacity}
            onSelect={(value) => onSelect({ capacity: value, type: "" })}
          />
          <FacetList
            title={isSsd ? "Formato" : "Tipo"}
            items={facets.formats || []}
            active={filters.format}
            onSelect={(value) => onSelect({ format: value, type: "" })}
          />
        </>
      ) : null}

      {isAirFryer ? (
        <FacetList
          title="Capacidade (litros)"
          items={facets.capacities || []}
          active={filters.capacity}
          onSelect={(value) => onSelect({ capacity: value, type: "" })}
        />
      ) : null}

      {isSmartphone ? (
        <>
          <FacetList
            title="Armazenamento"
            items={facets.capacities || []}
            active={filters.capacity}
            onSelect={(value) => onSelect({ capacity: value, type: "" })}
          />
          <FacetList
            title="RAM"
            items={facets.formats || []}
            active={filters.format}
            onSelect={(value) => onSelect({ format: value, type: "" })}
          />
        </>
      ) : null}

      {!isGpu &&
      !isCpu &&
      !isSsd &&
      !isRam &&
      !isAirFryer &&
      !isSmartphone ? (
        <FacetList
          title="Capacidade / Tipo"
          items={facets.types || []}
          active={filters.type}
          onSelect={(value) => onSelect({ type: value })}
        />
      ) : null}

      <FacetList
        title="Marca"
        items={facets.brands}
        active={filters.brand}
        onSelect={(value) => onSelect({ brand: value })}
        collapsible
        itemKey={(item) => `brand-${item.label}`}
      />
      <FacetList
        title="Loja"
        items={facets.stores}
        active={filters.store}
        onSelect={(value) => onSelect({ store: value })}
        itemKey={(item) => `store-${item.value}`}
      />
    </>
  );
}

export function FilterSidebar({
  facets,
  taxonomyFacets,
  taxonomySelection = {},
  onTaxonomySelectionChange,
  filters,
  inferredCategory,
  minDraft,
  maxDraft,
  onMinDraft,
  onMaxDraft,
  onSelect,
  onClear,
  onApplyPrice,
  showInStock = true,
  hideSubcategoryFilter = false,
  embedded = false,
}: Props) {
  const useTaxonomy = hasTaxonomyFacets(taxonomyFacets);
  const subcategories = facets.subcategories ?? [];
  const panelFacets = (taxonomyFacets || []).filter(
    (f) => !PRICE_INPUT_FACET_IDS.has(f.id),
  );

  const handleClear = () => {
    onClear();
  };

  const onPriceKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onApplyPrice();
    }
  };

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-[var(--hm-ink,#0b1220)]">
          Filtros
        </h2>
        <button
          type="button"
          className="text-xs text-[var(--hm-brand-deep,#e2550f)] hover:underline"
          onClick={handleClear}
        >
          Limpar
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hm-faint,#8b9aab)]">
          Intervalo de preço (€)
        </p>
        <div className="flex gap-2">
          <Input
            inputMode="decimal"
            placeholder="Mín"
            value={minDraft}
            onChange={(e) => onMinDraft(e.target.value)}
            onKeyDown={onPriceKeyDown}
            className="h-9"
            aria-label="Preço mínimo"
          />
          <Input
            inputMode="decimal"
            placeholder="Máx"
            value={maxDraft}
            onChange={(e) => onMaxDraft(e.target.value)}
            onKeyDown={onPriceKeyDown}
            className="h-9"
            aria-label="Preço máximo"
          />
        </div>
        <button type="button" className="catalog-cta w-full" onClick={onApplyPrice}>
          Aplicar preço
        </button>
      </div>

      {!hideSubcategoryFilter ? (
        <SubcategoryBlock
          items={subcategories}
          active={filters.subcategory}
          onSelect={(value) =>
            onSelect({
              subcategory: value,
              brand: "",
              model: "",
              vram: "",
              series: "",
              socket: "",
              capacity: "",
              format: "",
              type: "",
            })
          }
        />
      ) : null}

      {showInStock ? (
        <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--hm-line,#dde3ea)] px-3 py-2.5">
          <span className="text-sm font-medium text-[var(--hm-ink,#0b1220)]">
            Apenas em Stock
          </span>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => onSelect({ inStockOnly: e.target.checked })}
            className="h-4 w-4 rounded border-[var(--hm-line,#dde3ea)] text-[var(--hm-brand,#ff6a1a)] focus:ring-[var(--hm-brand,#ff6a1a)]"
          />
        </label>
      ) : null}

      {useTaxonomy && panelFacets.length && onTaxonomySelectionChange ? (
        <TaxonomyFilters
          facets={panelFacets}
          selection={taxonomySelection}
          onChange={onTaxonomySelectionChange}
          showHeader={false}
          onClearSelection={() =>
            onTaxonomySelectionChange(clearTaxonomySelection())
          }
        />
      ) : (
        <LegacyCategoryFacets
          facets={facets}
          filters={filters}
          inferredCategory={inferredCategory}
          onSelect={onSelect}
        />
      )}

      {!useTaxonomy && subcategories.length === 0 ? (
        <FacetList
          title="Categoria"
          items={facets.categories}
          active={filters.category}
          onSelect={(value) => onSelect({ category: value })}
          itemKey={(item) => `cat-${item.label}`}
        />
      ) : null}
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{inner}</div>;
  }

  return (
    <aside
      className={cn(
        "catalog-filters lymiar-sidebar space-y-6",
        "lg:sticky lg:top-20 lg:max-h-[calc(100vh-100px)] lg:self-start",
        "lg:overflow-y-auto lg:overscroll-contain lg:pr-2",
      )}
    >
      {inner}
    </aside>
  );
}
