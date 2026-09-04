"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, FileDown, Printer, Share2 } from "lucide-react";
import { detailToProduct, getProductBySlug } from "@/lib/api";
import {
  buildCompareShareUrl,
  clearCompare,
  COMPARE_MAX,
  compareIdsToParam,
  parseCompareIdsParam,
  productToCompareItem,
  readCompareList,
  removeFromCompare,
  writeCompareList,
  type CompareItem,
} from "@/lib/compare";
import {
  buildCompareRows,
  categoryLabelForProduct,
  computeCompareBadges,
  filterDiffRows,
  productsHaveMixedCategories,
  sortProducts,
  type CompareRow,
  type CompareSortKey,
} from "@/lib/compare-engine";
import {
  compareGroupLabel,
} from "@/lib/product-knowledge";
import type { Product } from "@/lib/types";
import { cn, formatEUR } from "@/lib/utils";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { CompareAddSearch } from "@/components/product/CompareAddSearch";
import { MiniSparkline } from "@/components/product/MiniSparkline";

type Loaded = { slug: string; item: CompareItem; product: Product | null };

const GROUP_LABEL: Record<string, string> = {
  price: "Preço",
  decision: "Decisão Lymiar",
  history: "Histórico",
  specs: "Ficha Técnica",
  insights: "Insights",
};

function groupHeading(id: string): string {
  return GROUP_LABEL[id] || compareGroupLabel(id);
}

const productCache = new Map<string, Product>();

async function loadProduct(slug: string): Promise<Product | null> {
  const hit = productCache.get(slug);
  if (hit) return hit;
  try {
    const detail = await getProductBySlug(slug);
    const product = detailToProduct(detail);
    productCache.set(slug, product);
    return product;
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ComparePageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idsFromUrl = searchParams.get("ids");
  const [rows, setRows] = useState<Loaded[]>([]);
  const [loading, setLoading] = useState(true);
  const [diffsOnly, setDiffsOnly] = useState(false);
  const [sortKey, setSortKey] = useState<CompareSortKey>("price");
  const [addOpen, setAddOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const syncingUrl = useRef(false);

  const hydrate = useCallback(async (slugs: string[]) => {
    setLoading(true);
    const unique = [...new Set(slugs)].slice(0, COMPARE_MAX);
    const loaded = await Promise.all(
      unique.map(async (slug) => {
        const product = await loadProduct(slug);
        const item: CompareItem = product
          ? { ...productToCompareItem(product), addedAt: Date.now() }
          : {
              slug,
              ean: "",
              name: slug,
              currentPrice: 0,
              lymiarIndex: 0,
              addedAt: Date.now(),
            };
        return { slug, item, product };
      }),
    );
    setRows(loaded);
    setLoading(false);
    writeCompareList(loaded.filter((r) => r.product).map((r) => r.item));
  }, []);

  useEffect(() => {
    const fromUrl = parseCompareIdsParam(idsFromUrl);
    if (fromUrl.length) {
      void hydrate(fromUrl);
      return;
    }
    const list = readCompareList();
    if (!list.length) {
      setRows([]);
      setLoading(false);
      return;
    }
    void hydrate(list.map((i) => i.slug));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsFromUrl]);

  useEffect(() => {
    if (loading || syncingUrl.current) return;
    const slugs = rows.map((r) => r.slug);
    const next = compareIdsToParam(slugs);
    const current = parseCompareIdsParam(idsFromUrl).join(",");
    if (next === current) return;
    syncingUrl.current = true;
    const href = next
      ? `/comparar/?ids=${encodeURIComponent(next)}`
      : "/comparar/";
    router.replace(href, { scroll: false });
    window.setTimeout(() => {
      syncingUrl.current = false;
    }, 50);
  }, [rows, loading, idsFromUrl, router]);

  const products = useMemo(
    () => rows.map((r) => r.product).filter(Boolean) as Product[],
    [rows],
  );

  const ordered = useMemo(
    () => sortProducts(products, sortKey),
    [products, sortKey],
  );

  const orderedRows = useMemo(() => {
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    return ordered
      .map((p) => bySlug.get(p.slug))
      .filter(Boolean) as Loaded[];
  }, [ordered, rows]);

  const badges = useMemo(() => computeCompareBadges(ordered), [ordered]);
  const badgesBySlug = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const b of badges) {
      const list = m.get(b.slug) || [];
      list.push(b.label);
      m.set(b.slug, list);
    }
    return m;
  }, [badges]);

  const mixed = useMemo(
    () => productsHaveMixedCategories(ordered),
    [ordered],
  );

  const compareRows = useMemo(() => {
    const all = buildCompareRows(ordered);
    return filterDiffRows(all, diffsOnly);
  }, [ordered, diffsOnly]);

  const groupedRows = useMemo(() => {
    let last = "";
    return compareRows.map((r) => {
      const showGroup = r.group !== last;
      if (showGroup) last = r.group;
      return { row: r, showGroup };
    });
  }, [compareRows]);

  const shareUrl = useMemo(
    () => buildCompareShareUrl(ordered.map((p) => p.slug)),
    [ordered],
  );

  const remove = (slug: string) => {
    removeFromCompare(slug);
    startTransition(() => {
      setRows((prev) => prev.filter((r) => r.slug !== slug));
    });
  };

  const reloadFromStorage = () => {
    const list = readCompareList();
    void hydrate(list.map((i) => i.slug));
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMsg("Ligação copiada");
    } catch {
      setShareMsg("Não foi possível copiar");
    }
  };

  const exportPdf = () => {
    if (ordered.length < 2) return;
    const header = ordered
      .map((p) => `<th>${escapeHtml(p.name)}</th>`)
      .join("");
    const body = buildCompareRows(ordered)
      .filter((r) => r.id !== "hist_spark")
      .map((r) => {
        const cells = r.cells
          .map(
            (c) =>
              `<td${c.best ? ' style="font-weight:700;color:#047857"' : ""}>${escapeHtml(c.text)}</td>`,
          )
          .join("");
        return `<tr><th>${escapeHtml(r.label)}</th>${cells}</tr>`;
      })
      .join("");
    const html = `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"/><title>Comparação Lymiar</title>
<style>
body{font-family:system-ui,sans-serif;margin:1.5rem;color:#0f172a}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#f8fafc}
h1{font-size:1.25rem}
.meta{color:#64748b;font-size:.85rem}
@media print{body{margin:0}}
</style></head><body>
<h1>Comparação Lymiar</h1>
<p class="meta">${escapeHtml(shareUrl)} · ${new Date().toLocaleString("pt-PT")}</p>
<table><thead><tr><th>Atributo</th>${header}</tr></thead><tbody>${body}</tbody></table>
<p class="meta">Dados observados — sem previsões inventadas. Imprimir → Guardar como PDF.</p>
<script>window.onload=()=>window.print()</script>
</body></html>`;
    const w = window.open("", "_blank", "noopener,noreferrer,width=960,height=900");
    if (!w) {
      setShareMsg("Permita pop-ups para exportar PDF");
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 print:max-w-none">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 print:hidden">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Comparador
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Até {COMPARE_MAX} produtos · destaque automático do melhor (sem
              inventar dados)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setAddOpen(true)}
              disabled={rows.length >= COMPARE_MAX}
            >
              Adicionar produto
            </Button>
            {ordered.length >= 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const focus = ordered[0];
                  const budget = Math.max(...ordered.map((p) => p.currentPrice));
                  try {
                    const { searchProducts, summaryToProduct } = await import(
                      "@/lib/api"
                    );
                    const { pickBestWithinBudget } = await import(
                      "@/lib/product-discovery"
                    );
                    const {
                      addToCompare,
                      productToCompareItem,
                      readCompareList,
                      COMPARE_MAX: max,
                    } = await import("@/lib/compare");
                    const q =
                      focus.chipsetModel ||
                      [focus.brand, focus.leafId].filter(Boolean).join(" ") ||
                      focus.name;
                    const res = await searchProducts(q, {
                      limit: 24,
                      sortBy: "lymiar_desc",
                    });
                    const pool = (res.results || []).map(summaryToProduct);
                    const tip = pickBestWithinBudget(focus, pool, budget);
                    if (!tip) {
                      setShareMsg("Sem alternativa superior dentro do orçamento");
                      return;
                    }
                    if (readCompareList().length >= max) {
                      setShareMsg("Comparador cheio");
                      return;
                    }
                    const detail = pool.find((p) => p.slug === tip.slug);
                    if (detail) {
                      addToCompare(productToCompareItem(detail));
                      setShareMsg(`Sugerido: ${tip.name}`);
                      reloadFromStorage();
                    }
                  } catch {
                    setShareMsg("Não foi possível sugerir");
                  }
                }}
              >
                Sugerir melhor
              </Button>
            ) : null}
            {ordered.length ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const { addProductToProject, createProject, listProjects } =
                    await import("@/lib/projects");
                  let projects = await listProjects();
                  let projectId = projects[0]?.id;
                  if (!projectId) {
                    const created = await createProject({
                      name: "Do comparador",
                      templateId: "blank",
                    });
                    projectId = created.id;
                  }
                  for (const p of ordered) {
                    await addProductToProject(projectId, p);
                  }
                  setShareMsg("Produtos enviados para projeto");
                }}
              >
                Enviar para projeto
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDiffsOnly((v) => !v)}
              aria-pressed={diffsOnly}
            >
              {diffsOnly ? "Mostrar tudo" : "Mostrar apenas diferenças"}
            </Button>
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              Ordenar
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as CompareSortKey)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                aria-label="Ordenar por"
              >
                <option value="price">Preço</option>
                <option value="score">Score</option>
                <option value="history">Histórico</option>
                <option value="brand">Marca</option>
                <option value="category">Categoria</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <Button type="button" variant="outline" size="sm" onClick={copyLink}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copiar ligação
          </Button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            WhatsApp
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Telegram
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent("Comparação Lymiar")}&body=${encodeURIComponent(shareUrl)}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Email
          </a>
          <Button type="button" variant="outline" size="sm" onClick={exportPdf}>
            <FileDown className="mr-1.5 h-3.5 w-3.5" />
            Exportar PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Imprimir
          </Button>
          {rows.length ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                clearCompare();
                setRows([]);
              }}
            >
              Limpar
            </Button>
          ) : null}
        </div>
        {shareMsg ? (
          <p className="mb-3 text-xs text-sky-700 print:hidden">{shareMsg}</p>
        ) : null}

        {mixed && ordered.length >= 2 ? (
          <div
            role="status"
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-950"
          >
            Estes produtos pertencem a categorias diferentes. Algumas
            características não podem ser comparadas.
          </div>
        ) : null}

        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        ) : ordered.length < 2 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <p className="font-display text-lg font-semibold text-slate-900">
              Precisa de pelo menos 2 produtos
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Use «VS» nas fichas ou adicione produtos aqui.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={() => setAddOpen(true)}>
                Adicionar produto
              </Button>
              <Link
                href="/catalog/"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Catálogo
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th
                    scope="col"
                    className="sticky left-0 z-30 min-w-[8.5rem] bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 sm:px-4"
                  >
                    Atributo
                  </th>
                  {orderedRows.map((row) => {
                    const p = row.product!;
                    const buy =
                      [...p.offers].sort((a, b) => a.price - b.price)[0]
                        ?.url || null;
                    const cat = categoryLabelForProduct(p);
                    const tags = badgesBySlug.get(p.slug) || [];
                    return (
                      <th
                        key={p.slug}
                        scope="col"
                        className="min-w-[11rem] max-w-[14rem] px-3 py-3 text-left align-top sm:px-4"
                      >
                        <div className="flex h-24 items-center justify-center rounded-lg bg-white p-2">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="max-h-full max-w-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-xs text-slate-400">
                              Sem imagem
                            </span>
                          )}
                        </div>
                        {p.brand ? (
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {p.brand}
                          </p>
                        ) : null}
                        <p className="mt-0.5 line-clamp-2 font-medium text-slate-900">
                          {p.name}
                        </p>
                        {cat !== "—" ? (
                          <p className="mt-0.5 text-xs text-slate-500">{cat}</p>
                        ) : null}
                        <p className="mt-1 font-display text-lg font-bold tabular-nums text-slate-900">
                          {formatEUR(p.currentPrice)}
                        </p>
                        {tags.length ? (
                          <ul className="mt-1.5 flex flex-wrap gap-1">
                            {tags.map((t) => (
                              <li
                                key={t}
                                className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800"
                              >
                                {t}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-1.5 print:hidden">
                          {buy ? (
                            <a
                              href={buy}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                buttonVariants({ size: "sm" }),
                                "h-8 text-xs",
                              )}
                            >
                              Comprar
                            </a>
                          ) : null}
                          <button
                            type="button"
                            className="h-8 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            onClick={() => remove(p.slug)}
                          >
                            Remover
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {groupedRows.map(({ row, showGroup }) => (
                  <CompareBodyRows
                    key={row.id}
                    showGroup={showGroup}
                    groupLabel={groupHeading(row.group)}
                    colSpan={ordered.length + 1}
                    row={row}
                  />
                ))}
                <tr className="border-t border-slate-100">
                  <th
                    scope="row"
                    className="sticky left-0 bg-white px-3 py-3 text-left font-medium text-slate-500 sm:px-4"
                  >
                    Ficha
                  </th>
                  {ordered.map((p) => (
                    <td key={p.slug} className="px-3 py-3 sm:px-4">
                      <Link
                        href={`/p/?id=${encodeURIComponent(p.slug)}`}
                        className="text-sky-700 hover:underline"
                      >
                        Ver produto
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
      <SiteFooter />

      <CompareAddSearch
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={reloadFromStorage}
      />
    </>
  );
}

function CompareBodyRows({
  showGroup,
  groupLabel,
  colSpan,
  row,
}: {
  showGroup: boolean;
  groupLabel: string;
  colSpan: number;
  row: CompareRow;
}) {
  return (
    <>
      {showGroup ? (
        <tr className="border-t border-slate-200 bg-slate-50/90">
          <th
            colSpan={colSpan}
            scope="colgroup"
            className="sticky left-0 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-4"
          >
            {groupLabel}
          </th>
        </tr>
      ) : null}
      <tr className="border-t border-slate-100">
        <th
          scope="row"
          className="sticky left-0 z-10 bg-white px-3 py-2.5 text-left text-xs font-medium text-slate-500 sm:px-4 sm:text-sm"
        >
          {row.label}
        </th>
        {row.cells.map((c, i) => (
          <td
            key={`${row.id}-${i}`}
            className={cn(
              "px-3 py-2.5 align-middle sm:px-4",
              c.best && "font-semibold text-emerald-700",
              !c.best && "text-slate-900",
              !row.allEqual &&
                !c.empty &&
                !c.best &&
                row.id.startsWith("spec_") &&
                "bg-amber-50/80",
            )}
          >
            {row.id === "hist_spark" ? (
              c.empty ? (
                "—"
              ) : (
                <MiniSparkline
                  values={c.text
                    .split(",")
                    .map(Number)
                    .filter((n) => Number.isFinite(n))}
                />
              )
            ) : (
              <span className="text-sm">{c.text}</span>
            )}
          </td>
        ))}
      </tr>
    </>
  );
}
