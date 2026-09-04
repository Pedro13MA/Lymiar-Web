"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OpportunityCard } from "@/components/product/OpportunityCard";
import { FilterSidebar, type FilterValues } from "@/components/search/FilterSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  searchProducts,
  summaryToProduct,
  type CanonicalHighlight,
  type SearchFacets,
  type SearchIntentPayload,
  type SearchSortBy,
  type TaxonomyFacet,
} from "@/lib/api";
import { apiClient, isAbortError } from "@/lib/api-client";
import { cn, formatEUR } from "@/lib/utils";
import { isP33SearchEnabled } from "@/lib/search/flags";
import { SearchEmptyState } from "@/components/search/SearchEmptyState";
import { WifiLoaderBlock } from "@/components/ui/WifiLoader";
import {
  appendSelectionToParams,
  clearTaxonomySelection,
  countSelected,
  selectionFromSearchParams,
  type TaxonomySelection,
} from "@/lib/taxonomy-facets";
import type { Product } from "@/lib/types";

const PAGE_SIZE = 24;

const SORT_OPTIONS: { value: SearchSortBy; label: string }[] = [
  { value: "lymiar_desc", label: "Melhor momento para comprar" },
  { value: "price_asc", label: "Preço mais baixo" },
  { value: "price_desc", label: "Preço mais alto" },
  { value: "discount_desc", label: "Maior Desconto" },
];

const INFERRED_LABEL: Record<string, string> = {
  gpu: "Placas Gráficas",
  ssd: "Armazenamento",
  ram: "RAM / Memória",
  cpu: "Processadores / CPUs",
};

type Filters = FilterValues & {
  sortBy: SearchSortBy;
  page: number;
};

function readFilters(params: URLSearchParams): Filters {
  const sort = (params.get("sort_by") || "lymiar_desc") as SearchSortBy;
  return {
    category: params.get("category") || "",
    subcategory: params.get("subcategory") || "",
    brand: params.get("brand") || "",
    store: params.get("store") || "",
    type: params.get("type") || "",
    model: params.get("model") || "",
    vram: params.get("vram") || "",
    series: params.get("series") || "",
    socket: params.get("socket") || "",
    capacity: params.get("capacity") || "",
    format: params.get("format") || "",
    minPrice: params.get("min_price") || params.get("price_min") || "",
    maxPrice: params.get("max_price") || params.get("price_max") || "",
    inStockOnly: params.get("in_stock") === "true",
    sortBy: SORT_OPTIONS.some((o) => o.value === sort) ? sort : "lymiar_desc",
    page: Math.max(1, Number(params.get("page") || "1") || 1),
  };
}

const EMPTY_FACETS: SearchFacets = {
  categories: [],
  subcategories: [],
  brands: [],
  stores: [],
  types: [],
  models: [],
  vram: [],
  series: [],
  sockets: [],
  capacities: [],
  formats: [],
  in_stock: [],
};

export function SearchPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /** String estável — evita cancelar fetch em loop quando a ref de searchParams muda. */
  const queryKey = searchParams.toString();
  const q = (searchParams.get("q") || "").trim();
  const filters = useMemo(
    () => readFilters(new URLSearchParams(queryKey)),
    [queryKey],
  );
  /** Deep-link: estado reconstruído da URL em cada navegação / refresh */
  const taxonomySelection = useMemo(
    () => selectionFromSearchParams(new URLSearchParams(queryKey)),
    [queryKey],
  );

  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        category: filters.category,
        subcategory: filters.subcategory,
        brand: filters.brand,
        store: filters.store,
        type: filters.type,
        model: filters.model,
        vram: filters.vram,
        series: filters.series,
        socket: filters.socket,
        capacity: filters.capacity,
        format: filters.format,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        inStockOnly: filters.inStockOnly,
        sortBy: filters.sortBy,
        page: filters.page,
      }),
    [filters],
  );
  const taxonomyKey = useMemo(
    () => JSON.stringify(taxonomySelection),
    [taxonomySelection],
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<SearchFacets>(EMPTY_FACETS);
  const [taxonomyFacets, setTaxonomyFacets] = useState<TaxonomyFacet[]>([]);
  const [inferred, setInferred] = useState<string | null>(null);
  const [canonicalHighlight, setCanonicalHighlight] =
    useState<CanonicalHighlight | null>(null);
  const [intent, setIntent] = useState<SearchIntentPayload | null>(null);
  const [didYouMean, setDidYouMean] = useState<string[]>([]);
  const [relatedQueries, setRelatedQueries] = useState<string[]>([]);
  const [categoryRedirect, setCategoryRedirect] = useState<{
    slug: string;
    url: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minDraft, setMinDraft] = useState(filters.minPrice);
  const [maxDraft, setMaxDraft] = useState(filters.maxPrice);

  useEffect(() => {
    setMinDraft(filters.minPrice);
    setMaxDraft(filters.maxPrice);
  }, [filters.minPrice, filters.maxPrice]);

  useEffect(() => {
    if (!q) return;
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "search", { search_term: q });
    }
  }, [q]);

  const buildSearchUrl = useCallback(
    (
      patch: Partial<Filters> & { q?: string },
      selection: TaxonomySelection = taxonomySelection,
    ) => {
      const next: Filters = { ...filters, ...patch, page: patch.page ?? 1 };
      const params = new URLSearchParams();
      const query = (patch.q ?? q).trim();
      if (query) params.set("q", query);
      if (next.category) params.set("category", next.category);
      if (next.subcategory) params.set("subcategory", next.subcategory);
      if (next.type) params.set("type", next.type);
      if (next.model) params.set("model", next.model);
      if (next.vram) params.set("vram", next.vram);
      if (next.series) params.set("series", next.series);
      if (next.socket) params.set("socket", next.socket);
      if (next.capacity) params.set("capacity", next.capacity);
      if (next.format) params.set("format", next.format);
      // Preço legado só se não houver price_* taxonomy
      if (!selection.price_min?.length && next.minPrice) {
        params.set("min_price", next.minPrice);
      }
      if (!selection.price_max?.length && next.maxPrice) {
        params.set("max_price", next.maxPrice);
      }
      if (next.inStockOnly) params.set("in_stock", "true");
      if (next.sortBy && next.sortBy !== "lymiar_desc") {
        params.set("sort_by", next.sortBy);
      }
      if (next.page > 1) params.set("page", String(next.page));
      appendSelectionToParams(params, selection);
      // Legado single brand/store (quando taxonomy UI não está a gerir esses keys)
      if (!selection.brand?.length && next.brand) {
        params.append("brand", next.brand);
      }
      if (!selection.store?.length && next.store) {
        params.append("store", next.store);
      }
      return `/search/?${params.toString()}`;
    },
    [filters, q, taxonomySelection],
  );

  const pushFilters = useCallback(
    (patch: Partial<Filters> & { q?: string }) => {
      router.push(buildSearchUrl(patch, taxonomySelection));
    },
    [buildSearchUrl, router, taxonomySelection],
  );

  const pushTaxonomySelection = useCallback(
    (nextSelection: TaxonomySelection) => {
      router.push(buildSearchUrl({ page: 1 }, nextSelection));
    },
    [buildSearchUrl, router],
  );

  useEffect(() => {
    if (!q) {
      setProducts([]);
      setTotal(0);
      setError(null);
      setTaxonomyFacets([]);
      return;
    }
    const controller = new AbortController();
    const hadResults = products.length > 0;
    setRefreshing(hadResults);
    setLoading(!hadResults);
    setError(null);
    const offset = (filters.page - 1) * PAGE_SIZE;
    const tax = taxonomySelection;
    const renderT0 = performance.now();
    searchProducts(q, {
      limit: PAGE_SIZE,
      offset,
      category: filters.category || undefined,
      // brand/store via taxonomyFilters (multi)
      type: filters.type || undefined,
      model: filters.model || undefined,
      vram: filters.vram || undefined,
      series: filters.series || undefined,
      socket: filters.socket || undefined,
      capacity: filters.capacity || undefined,
      format: filters.format || undefined,
      minPrice:
        !tax.price_min?.length && filters.minPrice
          ? Number(filters.minPrice)
          : undefined,
      maxPrice:
        !tax.price_max?.length && filters.maxPrice
          ? Number(filters.maxPrice)
          : undefined,
      sortBy: filters.sortBy,
      inStockOnly: filters.inStockOnly || undefined,
      subcategory: filters.subcategory || undefined,
      taxonomyFilters: countSelected(tax) > 0 ? tax : undefined,
      signal: controller.signal,
    })
      .then((res) => {
        const mapped: Product[] = [];
        for (const row of res.results) {
          try {
            mapped.push(summaryToProduct(row));
          } catch {
            // Não descartar a página inteira por um card inválido
          }
        }
        setProducts(mapped);
        setTotal(res.total);
        setFacets(res.facets || EMPTY_FACETS);
        setTaxonomyFacets(res.taxonomyFacets ?? []);
        setInferred(res.inferredCategory || null);
        setCanonicalHighlight(res.canonicalHighlight ?? null);
        setIntent(res.intent ?? null);
        setDidYouMean(res.didYouMean ?? []);
        setRelatedQueries(res.relatedQueries ?? []);
        setCategoryRedirect(res.categoryRedirect ?? null);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            apiClient.markRenderForLabel(
              "SEARCH",
              performance.now() - renderT0,
            );
          });
        });
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setError(err instanceof Error ? err.message : "Falha na pesquisa");
        setProducts([]);
        setTotal(0);
        setTaxonomyFacets([]);
        setCanonicalHighlight(null);
        setIntent(null);
        setDidYouMean([]);
        setRelatedQueries([]);
        setCategoryRedirect(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => {
      controller.abort();
    };
    // queryKey / filtersKey / taxonomyKey: strings estáveis (evita cancel loop)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filters/taxonomy derivados das keys
  }, [q, filtersKey, taxonomyKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!q) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <p className="catalog-kicker">Pesquisar</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-[var(--hm-ink)]">
          Pesquisa Lymiar
        </h1>
        <p className="mt-3 text-[var(--hm-muted)]">
          Escreve um termo (ex: SSD, CPU AMD, placa gráfica) e carrega Enter.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="catalog-kicker">Resultados</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-[var(--hm-ink)]">
            Resultados para «{q}»
          </h1>
          <p className="mt-2 text-sm text-[var(--hm-muted)]">
            {loading
              ? "A carregar…"
              : refreshing
                ? "Atualizando resultados…"
                : `${total} produto${total === 1 ? "" : "s"} encontrados`}
            {inferred ? (
              <Badge variant="teal" className="ml-2">
                {INFERRED_LABEL[inferred] || inferred}
              </Badge>
            ) : null}
            {isP33SearchEnabled() && intent?.brand ? (
              <Badge variant="tier" className="ml-2">
                {intent.brand}
              </Badge>
            ) : null}
            {isP33SearchEnabled() && intent?.intent_type ? (
              <Badge variant="default" className="ml-2">
                {intent.intent_type}
              </Badge>
            ) : null}
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm text-[var(--hm-muted)]">
          Ordenar por
          <select
            value={filters.sortBy}
            onChange={(e) =>
              pushFilters({ sortBy: e.target.value as SearchSortBy })
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

      {error ? (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <FilterSidebar
          facets={facets}
          taxonomyFacets={taxonomyFacets}
          taxonomySelection={taxonomySelection}
          onTaxonomySelectionChange={pushTaxonomySelection}
          filters={filters}
          inferredCategory={inferred}
          minDraft={minDraft}
          maxDraft={maxDraft}
          onMinDraft={setMinDraft}
          onMaxDraft={setMaxDraft}
          onSelect={(patch) => pushFilters(patch)}
          onClear={() => {
            router.push(
              buildSearchUrl(
                {
                  category: "",
                  subcategory: "",
                  brand: "",
                  store: "",
                  type: "",
                  model: "",
                  vram: "",
                  series: "",
                  socket: "",
                  capacity: "",
                  format: "",
                  minPrice: "",
                  maxPrice: "",
                  inStockOnly: false,
                  page: 1,
                },
                clearTaxonomySelection(),
              ),
            );
          }}
          onApplyPrice={() =>
            pushFilters({
              minPrice: minDraft.trim(),
              maxPrice: maxDraft.trim(),
            })
          }
        />

        <section>
          {canonicalHighlight ? (
            <Link
              href={
                canonicalHighlight.href?.startsWith("/catalogo")
                  ? `/search/?q=${encodeURIComponent(canonicalHighlight.title)}`
                  : canonicalHighlight.href ||
                    `/search/?q=${encodeURIComponent(canonicalHighlight.title)}`
              }
              className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--hm-brand)]/25 bg-[var(--hm-brand-soft)]/70 px-5 py-4 hover:border-[var(--hm-brand)]/40"
            >
              <div>
                <p className="catalog-kicker">Produto canónico</p>
                <p className="mt-1 font-display text-lg font-bold text-[var(--hm-ink)]">
                  {canonicalHighlight.title}
                </p>
                <p className="mt-1 text-sm text-[var(--hm-muted)]">
                  {canonicalHighlight.variantCount} variantes
                  {canonicalHighlight.minPrice != null
                    ? ` · desde ${formatEUR(canonicalHighlight.minPrice)}`
                    : ""}
                </p>
              </div>
              <span className="text-sm font-semibold text-[var(--hm-brand-deep)]">
                Escolher variante →
              </span>
            </Link>
          ) : null}
          {isP33SearchEnabled() &&
          (didYouMean.length > 0 || relatedQueries.length > 0) &&
          products.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--hm-muted)]">
              {didYouMean.length > 0 ? (
                <span>
                  Quis dizer{" "}
                  {didYouMean.map((t, i) => (
                    <span key={t}>
                      {i > 0 ? ", " : null}
                      <Link
                        href={buildSearchUrl({ q: t })}
                        className="font-medium text-[var(--hm-brand-deep)] hover:underline"
                      >
                        {t}
                      </Link>
                    </span>
                  ))}
                </span>
              ) : null}
              {relatedQueries.slice(0, 4).map((t) => (
                <Link
                  key={t}
                  href={buildSearchUrl({ q: t })}
                  className="rounded-lg border border-[var(--hm-line)] px-2.5 py-1 text-xs hover:border-[var(--hm-brand)]/40"
                >
                  {t}
                </Link>
              ))}
            </div>
          ) : null}
          {loading ? (
            <WifiLoaderBlock text="A procurar" />
          ) : products.length ? (
            <>
              <div
                className={cn(
                  "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 transition-opacity duration-200",
                  refreshing && "opacity-60 pointer-events-none",
                )}
              >
                {products.map((product) => (
                  <OpportunityCard key={product.ean || product.slug} product={product} compact />
                ))}
              </div>
              {totalPages > 1 ? (
                <div className="mt-10 flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={filters.page <= 1}
                    onClick={() => pushFilters({ page: filters.page - 1 })}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-[var(--hm-muted)]">
                    Página {filters.page} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={filters.page >= totalPages}
                    onClick={() => pushFilters({ page: filters.page + 1 })}
                  >
                    Seguinte
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <SearchEmptyState
              query={q}
              didYouMean={didYouMean}
              relatedQueries={relatedQueries}
              categoryRedirect={categoryRedirect}
              inferred={inferred}
            />
          )}
        </section>
      </div>
    </main>
  );
}
