"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Breadcrumbs } from "@/components/categoria/Breadcrumbs";
import { CatalogActiveChips } from "@/components/catalog/CatalogActiveChips";
import { CatalogEmptyState } from "@/components/catalog/CatalogEmptyState";
import { CatalogSidebar } from "@/components/catalog/CatalogSidebar";
import { OpportunityCard } from "@/components/product/OpportunityCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WifiLoaderBlock } from "@/components/ui/WifiLoader";
import {
  getCategory,
  getCategoryProducts,
  getDealsNow,
  getDealsWait,
  getTelegramDeals,
  searchProducts,
  summaryToProduct,
  type CategoryBreadcrumb,
  type SearchSortBy,
  type TaxonomyFacet,
} from "@/lib/api";
import {
  CATALOG_CONDITIONS,
  LEGACY_CATALOG_CATEGORY,
  matchesCatalogConditions,
  parseCatalogConditions,
  type CatalogChip,
  type CatalogConditionId,
} from "@/lib/catalog-ui";
import { TELEGRAM_CHANNEL } from "@/lib/constants";
import {
  appendSelectionToParams,
  clearTaxonomySelection,
  countSelected,
  formatFacetValueLabel,
  selectionFromSearchParams,
  type TaxonomySelection,
} from "@/lib/taxonomy-facets";
import type { Product } from "@/lib/types";
import { cn, formatEUR } from "@/lib/utils";

const PAGE_SIZE = 24;

export type CatalogSection = "deals" | "overpriced" | "";
type CatalogTab = "products" | "alerts";
type CatalogSort = "discount_desc" | "lymiar_desc" | "price_asc";

const SORT_OPTIONS: { value: CatalogSort; label: string; api?: SearchSortBy }[] = [
  { value: "discount_desc", label: "Maior Desconto", api: "discount_desc" },
  { value: "lymiar_desc", label: "Melhor decisão", api: "lymiar_desc" },
  { value: "price_asc", label: "Menor Preço", api: "price_asc" },
];

const SECTION_META: Record<
  Exclude<CatalogSection, "">,
  { title: string; subtitle: string }
> = {
  deals: {
    title: "Super Oportunidades",
    subtitle: "Produtos em mínimo histórico e melhores preços do momento.",
  },
  overpriced: {
    title: "Vale a Pena Esperar",
    subtitle: "Produtos atualmente acima do valor habitual de mercado.",
  },
};

function dedupeByEan(products: Product[]): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const p of products) {
    if (seen.has(p.ean)) continue;
    seen.add(p.ean);
    out.push(p);
  }
  return out;
}

function matchesQuery(product: Product, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return (
    product.name.toLowerCase().includes(term) ||
    product.ean.includes(term) ||
    (product.brand ?? "").toLowerCase().includes(term)
  );
}

function matchesPrice(
  product: Product,
  minPrice: string,
  maxPrice: string,
): boolean {
  const min = minPrice ? Number(minPrice) : NaN;
  const max = maxPrice ? Number(maxPrice) : NaN;
  if (Number.isFinite(min) && product.currentPrice < min) return false;
  if (Number.isFinite(max) && product.currentPrice > max) return false;
  return true;
}

function sortProducts(products: Product[], sort: CatalogSort): Product[] {
  const copy = [...products];
  if (sort === "price_asc") {
    copy.sort((a, b) => a.currentPrice - b.currentPrice);
  } else if (sort === "discount_desc") {
    copy.sort(
      (a, b) =>
        (b.decision.discountPct || b.dropTodayPct || 0) -
        (a.decision.discountPct || a.dropTodayPct || 0),
    );
  } else {
    copy.sort(
      (a, b) => b.decision.lymiarIndex.value - a.decision.lymiarIndex.value,
    );
  }
  return copy;
}

function readCatalogState(params: URLSearchParams) {
  const sectionRaw = (params.get("section") || "").trim().toLowerCase();
  const section: CatalogSection =
    sectionRaw === "deals" || sectionRaw === "overpriced" ? sectionRaw : "";

  const rawCat = (params.get("cat") || params.get("category") || "").trim();
  const cat = LEGACY_CATALOG_CATEGORY[rawCat] || rawCat;

  const conditions = parseCatalogConditions(params);
  const sortRaw = (params.get("sort") || "lymiar_desc") as CatalogSort;
  const sort = SORT_OPTIONS.some((o) => o.value === sortRaw)
    ? sortRaw
    : "lymiar_desc";
  const q = (params.get("q") || "").trim();
  const page = Math.max(1, Number(params.get("page") || "1") || 1);
  const tab: CatalogTab = params.get("tab") === "alerts" ? "alerts" : "products";
  const minPrice = params.get("min_price") || params.get("price_min") || "";
  const maxPrice = params.get("max_price") || params.get("price_max") || "";
  return {
    section,
    cat,
    conditions,
    sort,
    q,
    page,
    tab,
    minPrice,
    maxPrice,
  };
}

type CatalogState = ReturnType<typeof readCatalogState>;

export function CatalogPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useMemo(() => readCatalogState(searchParams), [searchParams]);
  const taxonomySelection = useMemo(
    () => selectionFromSearchParams(searchParams),
    [searchParams],
  );

  const [pool, setPool] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [taxonomyFacets, setTaxonomyFacets] = useState<TaxonomyFacet[]>([]);
  const [categoryCrumbs, setCategoryCrumbs] = useState<CategoryBreadcrumb[]>([]);
  const [categoryLabel, setCategoryLabel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryDraft, setQueryDraft] = useState(state.q);
  const [minDraft, setMinDraft] = useState(state.minPrice);
  const [maxDraft, setMaxDraft] = useState(state.maxPrice);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setQueryDraft(state.q);
  }, [state.q]);

  useEffect(() => {
    setMinDraft(state.minPrice);
    setMaxDraft(state.maxPrice);
  }, [state.minPrice, state.maxPrice]);

  const buildUrl = useCallback(
    (
      patch: Partial<CatalogState> & {
        taxonomy?: TaxonomySelection;
        clearTaxonomy?: boolean;
      },
    ) => {
      const next: CatalogState = {
        ...state,
        ...patch,
        page: patch.page ?? 1,
      };
      const params = new URLSearchParams();
      if (next.tab === "alerts") params.set("tab", "alerts");
      if (next.section) params.set("section", next.section);
      if (next.cat) params.set("cat", next.cat);
      for (const c of next.conditions) params.append("condition", c);
      if (next.sort && next.sort !== "lymiar_desc") params.set("sort", next.sort);
      if (next.q) params.set("q", next.q);
      if (next.minPrice) params.set("min_price", next.minPrice);
      if (next.maxPrice) params.set("max_price", next.maxPrice);
      if (next.page > 1) params.set("page", String(next.page));

      const tax = patch.clearTaxonomy
        ? clearTaxonomySelection()
        : (patch.taxonomy ?? taxonomySelection);
      appendSelectionToParams(params, tax);

      const qs = params.toString();
      return qs ? `/catalog/?${qs}` : "/catalog/";
    },
    [state, taxonomySelection],
  );

  const pushState = useCallback(
    (patch: Parameters<typeof buildUrl>[0]) => {
      router.push(buildUrl(patch));
      setDrawerOpen(false);
    },
    [buildUrl, router],
  );

  // Debounce search box → URL
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const trimmed = queryDraft.trim();
      if (trimmed === state.q) return;
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `/catalog/?${qs}` : "/catalog/");
    }, 350);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage ao draft
  }, [queryDraft]);

  const useCategoryApi =
    state.tab === "products" && !state.section && Boolean(state.cat);
  const useApiSearch =
    state.tab === "products" &&
    !state.section &&
    !state.cat &&
    state.q.length >= 2;

  // Breadcrumbs da categoria seleccionada (endpoint já existente)
  useEffect(() => {
    if (!state.cat) {
      setCategoryCrumbs([]);
      setCategoryLabel("");
      return;
    }
    let cancelled = false;
    getCategory(state.cat)
      .then((d) => {
        if (cancelled) return;
        setCategoryLabel(d.display_name);
        setCategoryCrumbs([
          { slug: "", display_name: "Catálogo", path: "/catalog/" },
          ...(d.breadcrumbs || []).map((b) => ({
            ...b,
            path: `/catalog/?cat=${encodeURIComponent(b.slug)}`,
          })),
        ]);
      })
      .catch(() => {
        if (!cancelled) {
          setCategoryLabel(state.cat);
          setCategoryCrumbs([
            { slug: "", display_name: "Catálogo", path: "/catalog/" },
            { slug: state.cat, display_name: state.cat },
          ]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [state.cat]);

  // Secções deals / pool local / alertas
  useEffect(() => {
    if (useCategoryApi || useApiSearch) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSearchResults(null);
    setSearchTotal(0);
    setTaxonomyFacets([]);

    (async () => {
      try {
        if (state.tab === "alerts") {
          const res = await getTelegramDeals(50, 168);
          if (cancelled) return;
          setPool(
            res.results
              .filter((s) => s.sentToTelegram !== false)
              .map(summaryToProduct),
          );
        } else if (state.section === "deals") {
          const res = await getDealsNow(50);
          if (cancelled) return;
          setPool(res.results.map(summaryToProduct));
        } else if (state.section === "overpriced") {
          const res = await getDealsWait(50);
          if (cancelled) return;
          setPool(res.results.map(summaryToProduct));
        } else {
          const [nowRes, waitRes] = await Promise.all([
            getDealsNow(50),
            getDealsWait(50),
          ]);
          if (cancelled) return;
          setPool(
            dedupeByEan([
              ...nowRes.results.map(summaryToProduct),
              ...waitRes.results.map(summaryToProduct),
            ]),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar catálogo");
          setPool([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.section, state.tab, useCategoryApi, useApiSearch]);

  // Categoria taxonomy → produtos (endpoint FASE 7.5, sem alterar backend)
  useEffect(() => {
    if (!useCategoryApi) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const offset = (state.page - 1) * PAGE_SIZE;
    const sortOpt = SORT_OPTIONS.find((o) => o.value === state.sort);
    const tax = { ...taxonomySelection };
    if (state.conditions.length) tax.condition = state.conditions;
    if (state.minPrice) tax.price_min = [state.minPrice];
    if (state.maxPrice) tax.price_max = [state.maxPrice];

    getCategoryProducts(state.cat, {
      q: state.q.length >= 2 ? state.q : undefined,
      limit: PAGE_SIZE,
      offset,
      sortBy: sortOpt?.api || "lymiar_desc",
      taxonomyFilters: countSelected(tax) > 0 ? tax : undefined,
    })
      .then((res) => {
        if (cancelled) return;
        let products = res.results.map(summaryToProduct);
        products = products.filter((p) =>
          matchesCatalogConditions(p.condition, state.conditions),
        );
        setSearchResults(products);
        setSearchTotal(res.total);
        setTaxonomyFacets(res.taxonomyFacets ?? []);
        if (res.breadcrumbs?.length) {
          setCategoryCrumbs([
            { slug: "", display_name: "Catálogo", path: "/catalog/" },
            ...res.breadcrumbs.map((b) => ({
              ...b,
              path: `/catalog/?cat=${encodeURIComponent(b.slug)}`,
            })),
          ]);
        }
        if (res.display_name) setCategoryLabel(res.display_name);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha a carregar categoria");
          setSearchResults([]);
          setSearchTotal(0);
          setTaxonomyFacets([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    useCategoryApi,
    state.cat,
    state.q,
    state.sort,
    state.page,
    state.conditions,
    state.minPrice,
    state.maxPrice,
    taxonomySelection,
  ]);

  // Pesquisa API (query sem categoria)
  useEffect(() => {
    if (!useApiSearch) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    const offset = (state.page - 1) * PAGE_SIZE;
    const sortOpt = SORT_OPTIONS.find((o) => o.value === state.sort);
    const tax = { ...taxonomySelection };
    if (state.conditions.length) tax.condition = state.conditions;
    if (state.minPrice) tax.price_min = [state.minPrice];
    if (state.maxPrice) tax.price_max = [state.maxPrice];

    searchProducts(state.q, {
      limit: PAGE_SIZE,
      offset,
      sortBy: sortOpt?.api || "lymiar_desc",
      taxonomyFilters: countSelected(tax) > 0 ? tax : undefined,
      minPrice: state.minPrice ? Number(state.minPrice) : undefined,
      maxPrice: state.maxPrice ? Number(state.maxPrice) : undefined,
    })
      .then((res) => {
        if (cancelled) return;
        let products = res.results.map(summaryToProduct);
        products = products.filter((p) =>
          matchesCatalogConditions(p.condition, state.conditions),
        );
        setSearchResults(products);
        setSearchTotal(res.total);
        setTaxonomyFacets(res.taxonomyFacets ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha na pesquisa");
          setSearchResults([]);
          setSearchTotal(0);
          setTaxonomyFacets([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    useApiSearch,
    state.q,
    state.sort,
    state.page,
    state.conditions,
    state.minPrice,
    state.maxPrice,
    taxonomySelection,
  ]);

  const filteredPool = useMemo(() => {
    let list = pool.filter(
      (p) =>
        matchesCatalogConditions(p.condition, state.conditions) &&
        matchesQuery(p, state.q) &&
        matchesPrice(p, state.minPrice, state.maxPrice),
    );
    list = sortProducts(list, state.sort);
    return list;
  }, [
    pool,
    state.conditions,
    state.q,
    state.sort,
    state.minPrice,
    state.maxPrice,
  ]);

  const usingRemote =
    (searchResults !== null && state.tab === "products" && !state.section) ||
    useCategoryApi ||
    useApiSearch;
  const total = usingRemote ? searchTotal : filteredPool.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(state.page, totalPages);

  const pageItems = useMemo(() => {
    if (usingRemote) return searchResults || [];
    const start = (page - 1) * PAGE_SIZE;
    return filteredPool.slice(start, start + PAGE_SIZE);
  }, [usingRemote, searchResults, filteredPool, page]);

  const shownFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const shownTo = Math.min(page * PAGE_SIZE, total);

  const breadcrumbItems: CategoryBreadcrumb[] = useMemo(() => {
    if (state.tab === "alerts") {
      return [
        { slug: "", display_name: "Catálogo", path: "/catalog/" },
        { slug: "alerts", display_name: "Histórico de Alertas" },
      ];
    }
    if (categoryCrumbs.length) {
      const lastFacet = Object.entries(taxonomySelection)[0];
      if (lastFacet?.[1]?.[0]) {
        const [fid, vals] = lastFacet;
        const facet = taxonomyFacets.find((f) => f.id === fid);
        const val = facet?.values.find(
          (v) => v.value.toLowerCase() === vals[0].toLowerCase(),
        );
        const label =
          (val && formatFacetValueLabel(facet?.type, val)) || vals[0];
        return [
          ...categoryCrumbs,
          { slug: `${fid}-${vals[0]}`, display_name: label },
        ];
      }
      return categoryCrumbs;
    }
    if (state.q) {
      return [
        { slug: "", display_name: "Catálogo", path: "/catalog/" },
        { slug: "q", display_name: `«${state.q}»` },
      ];
    }
    if (state.section && SECTION_META[state.section]) {
      return [
        { slug: "", display_name: "Catálogo", path: "/catalog/" },
        { slug: state.section, display_name: SECTION_META[state.section].title },
      ];
    }
    return [{ slug: "", display_name: "Catálogo", path: "/catalog/" }];
  }, [
    state.tab,
    state.q,
    state.section,
    categoryCrumbs,
    taxonomySelection,
    taxonomyFacets,
  ]);

  const chips: CatalogChip[] = useMemo(() => {
    const list: CatalogChip[] = [];
    if (state.cat) {
      list.push({
        key: `cat:${state.cat}`,
        label: categoryLabel || state.cat,
        onRemove: () => pushState({ cat: "", page: 1 }),
      });
    }
    for (const c of state.conditions) {
      const label =
        CATALOG_CONDITIONS.find((x) => x.id === c)?.label || c;
      list.push({
        key: `cond:${c}`,
        label,
        onRemove: () =>
          pushState({
            conditions: state.conditions.filter((x) => x !== c),
            page: 1,
          }),
      });
    }
    if (state.minPrice) {
      list.push({
        key: "min",
        label: `≥ ${state.minPrice} €`,
        onRemove: () => pushState({ minPrice: "", page: 1 }),
      });
    }
    if (state.maxPrice) {
      list.push({
        key: "max",
        label: `≤ ${state.maxPrice} €`,
        onRemove: () => pushState({ maxPrice: "", page: 1 }),
      });
    }
    for (const [fid, values] of Object.entries(taxonomySelection)) {
      const facet = taxonomyFacets.find((f) => f.id === fid);
      for (const v of values) {
        const match = facet?.values.find(
          (x) => x.value.toLowerCase() === v.toLowerCase(),
        );
        const label =
          (match && formatFacetValueLabel(facet?.type, match)) || v;
        list.push({
          key: `${fid}:${v}`,
          label,
          onRemove: () => {
            const next = { ...taxonomySelection };
            next[fid] = (next[fid] || []).filter(
              (x) => x.toLowerCase() !== v.toLowerCase(),
            );
            if (!next[fid]?.length) delete next[fid];
            pushState({ taxonomy: next, page: 1 });
          },
        });
      }
    }
    return list;
  }, [
    state.cat,
    state.conditions,
    state.minPrice,
    state.maxPrice,
    categoryLabel,
    taxonomySelection,
    taxonomyFacets,
    pushState,
  ]);

  const clearFilters = useCallback(() => {
    pushState({
      cat: "",
      conditions: [],
      minPrice: "",
      maxPrice: "",
      q: "",
      page: 1,
      clearTaxonomy: true,
    });
    setQueryDraft("");
  }, [pushState]);

  const meta =
    state.tab === "alerts"
      ? {
          title: "Histórico de Alertas do Bot",
          subtitle:
            "Oportunidades com perfil de publicação no canal Telegram Lymiar.",
        }
      : state.section
        ? SECTION_META[state.section]
        : {
            title: "Catálogo Lymiar",
            subtitle:
              "Navega a taxonomy, filtra por estado e facets, e encontra o melhor momento para comprar.",
          };

  const sidebar = (
    <CatalogSidebar
      activeCategory={state.cat}
      onSelectCategory={(slug) =>
        pushState({ cat: slug, section: "", page: 1 })
      }
      conditions={state.conditions}
      onConditionsChange={(conditions) => pushState({ conditions, page: 1 })}
      minDraft={minDraft}
      maxDraft={maxDraft}
      onMinDraft={setMinDraft}
      onMaxDraft={setMaxDraft}
      onApplyPrice={() =>
        pushState({ minPrice: minDraft, maxPrice: maxDraft, page: 1 })
      }
      taxonomyFacets={taxonomyFacets}
      taxonomySelection={taxonomySelection}
      onTaxonomySelectionChange={(taxonomy) =>
        pushState({ taxonomy, page: 1 })
      }
      onClearAll={clearFilters}
    />
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-4">
        <Breadcrumbs items={breadcrumbItems} className="mb-3" />
        <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          {meta.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{meta.subtitle}</p>
      </div>

      <div className="mb-6 flex gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => pushState({ tab: "products", page: 1 })}
          className={cn(
            "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
            state.tab === "products"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          )}
        >
          Produtos
        </button>
        <button
          type="button"
          onClick={() =>
            pushState({ tab: "alerts", section: "", cat: "", page: 1 })
          }
          className={cn(
            "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
            state.tab === "alerts"
              ? "bg-sky-700 text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          )}
        >
          Histórico de Alertas do Bot
        </button>
      </div>

      {state.tab === "alerts" ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Alertas com mínimo histórico, semáforo comprar ou Índice ≥ 85.
          </p>
          <a
            href={TELEGRAM_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center rounded-xl bg-sky-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-800"
          >
            Entrar no Telegram
          </a>
        </div>
      ) : (
        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={queryDraft}
            onChange={(e) => setQueryDraft(e.target.value)}
            placeholder="Pesquisar no catálogo…"
            className="h-12 rounded-xl pl-10"
            aria-label="Pesquisar catálogo"
          />
        </div>
      )}

      {state.tab === "products" ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CatalogActiveChips chips={chips} onClearAll={clearFilters} />
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm lg:hidden"
              onClick={() => setDrawerOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {chips.length ? (
                <span className="rounded-full bg-sky-100 px-1.5 text-[10px] font-bold text-sky-800">
                  {chips.length}
                </span>
              ) : null}
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span className="shrink-0">Ordenar</span>
              <select
                value={state.sort}
                onChange={(e) =>
                  pushState({ sort: e.target.value as CatalogSort, page: 1 })
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}

      <p className="mb-5 text-sm text-slate-500">
        {loading
          ? "A carregar…"
          : total === 0
            ? "Nenhum produto com estes filtros."
            : `A mostrar ${shownFrom}–${shownTo} de ${total} ${
                state.tab === "alerts" ? "alerta" : "produto"
              }${total === 1 ? "" : "s"}`}
      </p>

      {error ? (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <div
        className={cn(
          state.tab === "products"
            ? "grid gap-8 lg:grid-cols-[260px_1fr]"
            : "",
        )}
      >
        {state.tab === "products" ? (
          <div className="hidden lg:block">{sidebar}</div>
        ) : null}

        <section>
          {loading ? (
            <WifiLoaderBlock text="A carregar" />
          ) : pageItems.length ? (
            state.tab === "alerts" ? (
              <div className="space-y-3">
                {pageItems.map((product) => (
                  <a
                    key={product.ean}
                    href={`/p/?id=${encodeURIComponent(product.slug)}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-sky-200/80 bg-gradient-to-r from-white to-sky-50/50 px-4 py-3 shadow-sm transition-colors hover:border-sky-300"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-xs text-sky-700">
                        {product.decision.isHistoricalMin
                          ? "Mínimo histórico observado"
                          : "Alerta enviado ao canal"}
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-lg font-bold text-slate-900">
                      {formatEUR(product.currentPrice)}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {pageItems.map((product) => (
                  <OpportunityCard
                    key={product.ean}
                    product={product}
                    compact
                    detectedAt={
                      state.tab === "alerts" ? product.detectedAt : undefined
                    }
                  />
                ))}
              </div>
            )
          ) : (
            <CatalogEmptyState
              onClearFilters={clearFilters}
              onBackToCatalog={() => {
                clearFilters();
                pushState({ section: "", tab: "products", page: 1 });
              }}
            />
          )}

          {totalPages > 1 ? (
            <div className="mt-10 flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => pushState({ page: page - 1 })}
              >
                Anterior
              </Button>
              <span className="text-sm text-slate-600">
                Página {page} de {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => pushState({ page: page + 1 })}
              >
                Seguinte
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Fechar filtros"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-slate-50 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <p className="font-display text-sm font-semibold text-slate-900">
                Filtros
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{sidebar}</div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
