"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Breadcrumbs } from "@/components/categoria/Breadcrumbs";
import { CategorySEO } from "@/components/categoria/CategorySEO";
import { OpportunityCard } from "@/components/product/OpportunityCard";
import { FilterSidebar, type FilterValues } from "@/components/search/FilterSidebar";
import { CatalogActiveChips } from "@/components/catalog/CatalogActiveChips";
import { Button } from "@/components/ui/button";
import { WifiLoaderBlock } from "@/components/ui/WifiLoader";
import { WatchButton } from "@/components/watchlists/WatchButton";
import {
  getCategory,
  getCategoryProducts,
  summaryToProduct,
  type CategoryDetail,
  type SearchFacets,
  type SearchSortBy,
  type TaxonomyFacet,
} from "@/lib/api";
import { resolveConsumerDecision } from "@/lib/consumer-decision";
import type { CatalogChip } from "@/lib/catalog-ui";
import {
  appendSelectionToParams,
  buildActiveFilterChips,
  clearTaxonomySelection,
  countSelected,
  removeActiveFilterChip,
  selectionFromSearchParamsWithLegacy,
  withPriceSelection,
  type TaxonomySelection,
} from "@/lib/taxonomy-facets";
import type { Product } from "@/lib/types";
import { relatedForSlug } from "@/lib/nav/build-menu";
import { EmptyCategory } from "@/components/nav/EmptyCategory";
import { useTaxonomyNavOptional } from "@/components/nav/TaxonomyTreeProvider";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;

const LEGACY_FILTER_TO_TAXONOMY: Partial<
  Record<keyof FilterValues, string>
> = {
  brand: "brand",
  store: "store",
  model: "model",
  vram: "vram_gb",
  series: "series",
  socket: "socket",
  capacity: "capacity_gb",
};

const SORT_OPTIONS: { value: SearchSortBy; label: string }[] = [
  { value: "lymiar_desc", label: "Sinal Lymiar (recomendado)" },
  { value: "price_asc", label: "Preço mais baixo" },
  { value: "price_desc", label: "Preço mais alto" },
  { value: "discount_desc", label: "Maior desconto" },
];

const EMPTY_FACETS: SearchFacets = {
  categories: [],
  subcategories: [],
  brands: [],
  stores: [],
  types: [],
};

type Props = {
  slug: string;
  initialCategory?: CategoryDetail | null;
};

export function CategoryPage({ slug, initialCategory = null }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  /** String estável — evita cancelar fetch em loop (mesmo padrão P3.2.2 Search). */
  const queryKey = searchParams.toString();
  const nav = useTaxonomyNavOptional();
  const related = useMemo(
    () => (nav?.tree?.length ? relatedForSlug(nav.tree, slug) : []),
    [nav?.tree, slug],
  );
  const q = (new URLSearchParams(queryKey).get("q") || "").trim();
  const sortBy = (new URLSearchParams(queryKey).get("sort_by") ||
    "lymiar_desc") as SearchSortBy;
  const page = Math.max(
    1,
    Number(new URLSearchParams(queryKey).get("page") || "1") || 1,
  );
  const taxonomySelection = useMemo(
    () => selectionFromSearchParamsWithLegacy(new URLSearchParams(queryKey)),
    [queryKey],
  );
  const taxonomyKey = useMemo(
    () => JSON.stringify(taxonomySelection),
    [taxonomySelection],
  );

  const [category, setCategory] = useState<CategoryDetail | null>(initialCategory);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalInCategory, setTotalInCategory] = useState<number | null>(null);
  const [facets, setFacets] = useState<SearchFacets>(EMPTY_FACETS);
  const [taxonomyFacets, setTaxonomyFacets] = useState<TaxonomyFacet[]>([]);
  const [jsonLd, setJsonLd] = useState<Record<string, unknown>[]>(
    initialCategory?.json_ld || [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minDraft, setMinDraft] = useState("");
  const [maxDraft, setMaxDraft] = useState("");

  const filters: FilterValues = useMemo(() => {
    const sp = new URLSearchParams(queryKey);
    return {
      category: "",
      subcategory: "",
      brand: sp.get("brand") || "",
      store: sp.get("store") || "",
      type: "",
      model: "",
      vram: "",
      series: "",
      socket: "",
      capacity: "",
      format: "",
      minPrice: sp.get("min_price") || sp.get("price_min") || "",
      maxPrice: sp.get("max_price") || sp.get("price_max") || "",
      inStockOnly: false,
    };
  }, [queryKey]);

  useEffect(() => {
    setMinDraft(filters.minPrice);
    setMaxDraft(filters.maxPrice);
  }, [filters.minPrice, filters.maxPrice]);

  const buildUrl = useCallback(
    (
      patch: {
        q?: string;
        sortBy?: SearchSortBy;
        page?: number;
        minPrice?: string;
        maxPrice?: string;
      },
      selection: TaxonomySelection = taxonomySelection,
    ) => {
      let nextSelection = selection;
      if (patch.minPrice !== undefined || patch.maxPrice !== undefined) {
        nextSelection = withPriceSelection(
          selection,
          patch.minPrice !== undefined ? patch.minPrice : undefined,
          patch.maxPrice !== undefined ? patch.maxPrice : undefined,
        );
      }

      const params = new URLSearchParams();
      const query = patch.q !== undefined ? patch.q.trim() : q;
      if (query) params.set("q", query);
      const sort = patch.sortBy ?? sortBy;
      if (sort && sort !== "lymiar_desc") params.set("sort_by", sort);
      const nextPage = patch.page ?? page;
      if (nextPage > 1) params.set("page", String(nextPage));
      appendSelectionToParams(params, nextSelection);
      const qs = params.toString();
      return `/categoria/${slug}/${qs ? `?${qs}` : ""}`;
    },
    [page, q, slug, sortBy, taxonomySelection],
  );

  const clearAllFilters = useCallback(() => {
    setMinDraft("");
    setMaxDraft("");
    router.push(
      buildUrl(
        { page: 1, minPrice: "", maxPrice: "", q: "" },
        clearTaxonomySelection(),
      ),
    );
  }, [buildUrl, router]);

  const activeChips: CatalogChip[] = useMemo(() => {
    const raw = buildActiveFilterChips(taxonomySelection, taxonomyFacets, { q });
    return raw.map((chip) => ({
      key: chip.key,
      label: chip.label,
      onRemove: () => {
        if (chip.facetId === "q") {
          router.push(buildUrl({ page: 1, q: "" }));
          return;
        }
        if (chip.facetId === "price_min") setMinDraft("");
        if (chip.facetId === "price_max") setMaxDraft("");
        const next = removeActiveFilterChip(taxonomySelection, chip);
        router.push(buildUrl({ page: 1 }, next));
      },
    }));
  }, [taxonomySelection, taxonomyFacets, q, buildUrl, router]);

  useEffect(() => {
    let cancelled = false;
    if (!initialCategory) {
      getCategory(slug)
        .then((c) => {
          if (!cancelled) {
            setCategory(c);
            setJsonLd(c.json_ld || []);
          }
        })
        .catch(() => {
          if (!cancelled) setCategory(null);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [slug, initialCategory]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const offset = (page - 1) * PAGE_SIZE;
    const tax = taxonomySelection;
    const hasFilters = countSelected(tax) > 0;
    getCategoryProducts(slug, {
      q: q || undefined,
      limit: PAGE_SIZE,
      offset,
      sortBy: SORT_OPTIONS.some((o) => o.value === sortBy) ? sortBy : "lymiar_desc",
      taxonomyFilters: hasFilters ? tax : undefined,
    })
      .then((res) => {
        if (cancelled) return;
        const mapped: Product[] = [];
        for (const row of res.results) {
          try {
            mapped.push(summaryToProduct(row));
          } catch {
            /* skip malformed card — não derrubar a grelha */
          }
        }
        setProducts(mapped);
        setTotal(res.total);
        setTotalInCategory(
          res.total_in_category != null ? res.total_in_category : res.total,
        );
        setFacets(res.facets || EMPTY_FACETS);
        setTaxonomyFacets(res.taxonomyFacets ?? []);
        setCategory((prev) =>
          prev
            ? prev
            : {
                slug: res.slug,
                display_name: res.display_name,
                level: res.level,
                is_active: true,
                taxonomy_path: res.breadcrumbs.map((b) => b.slug),
                breadcrumbs: res.breadcrumbs,
                children: [],
                seo: res.seo,
              },
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha a carregar categoria");
          setProducts([]);
          setTotal(0);
          setTotalInCategory(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, q, page, sortBy, taxonomyKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters =
    countSelected(taxonomySelection) > 0 || Boolean(q);
  const categoryTotal =
    totalInCategory ?? (loading ? null : total);
  const recommended = useMemo(
    () =>
      products
        .filter((p) => {
          const cd = resolveConsumerDecision(p);
          if (cd?.verdict) return cd.verdict === "BUY";
          return p.decision?.semaphore === "buy";
        })
        .slice(0, 4),
    [products],
  );
  const recommendedKeys = useMemo(
    () => new Set(recommended.map((p) => p.ean || p.slug)),
    [recommended],
  );
  const gridProducts = useMemo(
    () => products.filter((p) => !recommendedKeys.has(p.ean || p.slug)),
    [products, recommendedKeys],
  );

  if (!category && !loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-[var(--hm-ink)]">
          Categoria não encontrada
        </h1>
        <p className="mt-3 text-[var(--hm-muted)]">
          Esta categoria não existe ou está reservada.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:max-w-7xl">
      <Breadcrumbs items={category?.breadcrumbs || []} className="mb-5" />

      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-3">
          <p className="catalog-kicker">Categoria</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--hm-ink)] sm:text-4xl">
            {category?.display_name || (loading ? "A carregar" : "Categoria")}
          </h1>
          <p className="text-sm text-[var(--hm-muted)]">
            {loading && !products.length
              ? "A carregar produtos…"
              : hasActiveFilters
                ? `${total} resultado${total === 1 ? "" : "s"} com estes filtros`
                : categoryTotal != null
                  ? `${categoryTotal} produto${categoryTotal === 1 ? "" : "s"} nesta categoria`
                  : `${total} produto${total === 1 ? "" : "s"}`}
            {q ? <span className="ml-1">· «{q}»</span> : null}
          </p>
          {category?.seo ? (
            <CategorySEO
              seo={category.seo}
              jsonLd={jsonLd.length ? jsonLd : category.json_ld}
              description={
                category.seo.meta_description || category.seo.description
              }
              compact
            />
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {category ? (
            <WatchButton
              kind="CATEGORY"
              target={{
                key: slug,
                label: category.display_name,
                href: `/categoria/${encodeURIComponent(slug)}/`,
              }}
            />
          ) : null}
          <label className="flex flex-col gap-1 text-sm text-[var(--hm-muted)]">
            Ordenar por
            <select
              value={sortBy}
              onChange={(e) =>
                router.push(
                  buildUrl({ sortBy: e.target.value as SearchSortBy, page: 1 }),
                )
              }
              className="catalog-select"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {error ? (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,272px)_minmax(0,1fr)] lg:gap-8">
        <aside
          className={cn(
            "catalog-filters lymiar-sidebar order-2 space-y-4 lg:order-1 lg:sticky lg:top-20",
            "lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pr-1",
          )}
        >
          {activeChips.length ? (
            <CatalogActiveChips
              chips={activeChips}
              onClearAll={clearAllFilters}
            />
          ) : null}
          <FilterSidebar
            facets={facets}
            taxonomyFacets={taxonomyFacets}
            taxonomySelection={taxonomySelection}
            onTaxonomySelectionChange={(next) =>
              router.push(buildUrl({ page: 1 }, next))
            }
            filters={filters}
            inferredCategory={slug}
            showInStock={false}
            hideSubcategoryFilter
            embedded
            minDraft={minDraft}
            maxDraft={maxDraft}
            onMinDraft={setMinDraft}
            onMaxDraft={setMaxDraft}
            onSelect={(patch) => {
              const nextSel = { ...taxonomySelection };
              for (const [legacyKey, taxKey] of Object.entries(
                LEGACY_FILTER_TO_TAXONOMY,
              )) {
                const val = patch[legacyKey as keyof FilterValues];
                if (val === undefined) continue;
                if (val) nextSel[taxKey] = [String(val)];
                else delete nextSel[taxKey];
              }
              router.push(
                buildUrl(
                  {
                    page: 1,
                    minPrice:
                      patch.minPrice !== undefined
                        ? patch.minPrice
                        : undefined,
                    maxPrice:
                      patch.maxPrice !== undefined
                        ? patch.maxPrice
                        : undefined,
                  },
                  nextSel,
                ),
              );
            }}
            onClear={clearAllFilters}
            onApplyPrice={() =>
              router.push(
                buildUrl({
                  page: 1,
                  minPrice: minDraft.trim(),
                  maxPrice: maxDraft.trim(),
                }),
              )
            }
          />
        </aside>

        <section className="order-1 min-w-0 lg:order-2">
          {!loading && recommended.length ? (
            <div className="catalog-section mb-8 space-y-3">
              <p className="catalog-kicker">Destaques</p>
              <h2 className="font-display text-xl font-bold text-[var(--hm-ink)]">
                Sinal favorável nesta página
              </h2>
              <p className="text-sm text-[var(--hm-muted)]">
                Produtos com índice Lymiar elevado entre os resultados abaixo.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {recommended.map((product) => (
                  <OpportunityCard
                    key={`rec-${product.ean || product.slug}`}
                    product={product}
                    compact
                  />
                ))}
              </div>
            </div>
          ) : null}
          {loading ? (
            <WifiLoaderBlock text="A carregar" />
          ) : products.length ? (
            <>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-[var(--hm-ink)]">
                  Todos os produtos
                </h2>
                <p className="text-sm text-[var(--hm-faint)]">
                  {hasActiveFilters
                    ? `${total} nesta vista`
                    : `${total} listados`}
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {gridProducts.map((product) => (
                  <OpportunityCard
                    key={product.ean || product.slug}
                    product={product}
                    compact
                  />
                ))}
              </div>
              {totalPages > 1 ? (
                <div className="mt-10 flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => router.push(buildUrl({ page: page - 1 }))}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-[var(--hm-muted)]">
                    Página {page} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => router.push(buildUrl({ page: page + 1 }))}
                  >
                    Seguinte
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyCategory
              title={category?.display_name || slug}
              parentHref={
                category?.parent
                  ? `/categoria/${category.parent}/`
                  : "/categorias/"
              }
              parentLabel={
                category?.parent ? "Ver categoria pai" : "Todas as categorias"
              }
              related={related}
            />
          )}
        </section>
      </div>
    </main>
  );
}
