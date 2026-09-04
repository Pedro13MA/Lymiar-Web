"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Copy,
  FileDown,
  GitCompareArrows,
  Printer,
  Search,
  Share2,
} from "lucide-react";
import {
  detailToProduct,
  getProductBySlug,
  searchProducts,
  summaryToProduct,
} from "@/lib/api";
import {
  addCustomSlot,
  archiveProject,
  clearSlot,
  computeProjectSummary,
  deleteProject,
  duplicateProject,
  getProject,
  projectTotal,
  recordCompatibilitySnapshot,
  refreshSlotFromProduct,
  reinsertProject,
  reorderSlots,
  setSlotProduct,
  subscribeProjects,
  toggleSlotSelected,
} from "@/lib/projects";
import type { Project, ProjectSlot } from "@/lib/projects/types";
import {
  knowledgeSuggestionChips,
  scoreKnowledgeCompleteness,
  leafFromProduct,
} from "@/lib/product-knowledge";
import {
  addToCompare,
  productToCompareItem,
} from "@/lib/compare";
import type { Product } from "@/lib/types";
import { storeDisplayName } from "@/lib/storeLogos";
import { cn, formatEUR } from "@/lib/utils";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { WatchButton } from "@/components/watchlists/WatchButton";
import { EntityActivityTimeline } from "@/components/watchlists/EntityActivityTimeline";
import { baselineFromTotal } from "@/lib/watchlists";
import { useSnackbar } from "@/components/user-space/Snackbar";
import {
  CompatScoreBadge,
  ProjectCompatHealth,
} from "@/components/projects/ProjectCompatHealth";
import { evaluateProjectCompatibility } from "@/lib/compatibility";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unitPrice(slot: ProjectSlot): number {
  if (!slot.product) return 0;
  if (slot.product.offers?.length) {
    return Math.min(...slot.product.offers.map((o) => o.price));
  }
  return slot.product.currentPrice;
}

export function ProjectDetailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = (searchParams.get("id") || "").trim();
  const { push } = useSnackbar();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [slotSearch, setSlotSearch] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    const p = await getProject(id);
    setProject(p);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void reload();
    return subscribeProjects(() => {
      void reload();
    });
  }, [reload]);

  // Refresh prices once per project id
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const p = await getProject(id);
      if (!p || cancelled) return;
      for (const slot of p.slots) {
        if (!slot.product || cancelled) continue;
        try {
          const d = await getProductBySlug(slot.product.slug);
          await refreshSlotFromProduct(p.id, slot.slotId, detailToProduct(d));
        } catch {
          /* keep */
        }
      }
      if (!cancelled) await reload();
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reload]);

  useEffect(() => {
    if (!project) return;
    const compat = evaluateProjectCompatibility(project);
    void recordCompatibilitySnapshot(
      project.id,
      compat.overallScore,
      compat.counts.warning,
      compat.counts.incompatible,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    project?.id,
    project?.slots.map((s) => `${s.slotId}:${s.product?.slug || ""}`).join("|"),
  ]);

  useEffect(() => {
    if (!slotSearch) return;
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setSearching(true);
      searchProducts(term, { limit: 12, sortBy: "lymiar_desc" })
        .then((res) => {
          if (cancelled) return;
          const mapped = (res.results || []).map(summaryToProduct);
          // FASE 7.15 — enriquecer ordem das sugestões com completeness factual (sem novas regras de compat)
          mapped.sort((a, b) => {
            const ca = scoreKnowledgeCompleteness(
              (a.typedAttributes || {}) as Record<string, unknown>,
              leafFromProduct(a),
            );
            const cb = scoreKnowledgeCompleteness(
              (b.typedAttributes || {}) as Record<string, unknown>,
              leafFromProduct(b),
            );
            if (cb !== ca) return cb - ca;
            return b.decision.lymiarIndex.value - a.decision.lymiarIndex.value;
          });
          setResults(mapped);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, slotSearch]);

  const summary = useMemo(
    () => (project ? computeProjectSummary(project) : null),
    [project],
  );

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "";

  if (loading) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-10">
          <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        </main>
      </>
    );
  }

  if (!project || !summary) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold">Projeto não encontrado</h1>
          <Link href="/projetos/" className="mt-4 inline-block text-sky-700">
            Voltar aos projetos
          </Link>
        </main>
      </>
    );
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMsg("Ligação copiada");
    } catch {
      setMsg("Falha ao copiar");
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lymiar-projeto-${project.name}.json`;
    a.click();
  };

  const exportCsv = () => {
    const lines = [
      "slot,produto,preço,loja,score",
      ...project.slots.map((s) => {
        const store =
          s.product?.offers?.sort((a, b) => a.price - b.price)[0]?.storeName ||
          "";
        return [
          `"${s.label}"`,
          `"${(s.product?.name || "").replace(/"/g, '""')}"`,
          unitPrice(s),
          `"${store}"`,
          s.product?.lymiarIndex ?? "",
        ].join(",");
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lymiar-projeto-${project.name}.csv`;
    a.click();
  };

  const exportPdf = () => {
    const rows = project.slots
      .map(
        (s) =>
          `<tr><td>${escapeHtml(s.label)}</td><td>${escapeHtml(s.product?.name || "—")}</td><td>${s.product ? formatEUR(unitPrice(s)) : "—"}</td></tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"/><title>${escapeHtml(project.name)}</title>
<style>body{font-family:system-ui;margin:1.5rem}table{width:100%;border-collapse:collapse;font-size:12px}
td,th{border:1px solid #e2e8f0;padding:6px;text-align:left}@media print{body{margin:0}}</style></head><body>
<h1>${escapeHtml(project.name)}</h1>
<p>${escapeHtml(project.description)}</p>
<p>Total ${formatEUR(summary.total)}</p>
<table><thead><tr><th>Slot</th><th>Produto</th><th>Preço</th></tr></thead><tbody>${rows}</tbody></table>
<script>window.onload=()=>window.print()</script></body></html>`;
    const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=800");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  const onDrop = async (targetSlotId: string) => {
    if (!dragId || dragId === targetSlotId) {
      setDragId(null);
      return;
    }
    const ids = project.slots.map((s) => s.slotId);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetSlotId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    await reorderSlots(project.id, ids);
    setDragId(null);
    await reload();
  };

  const hist = project.priceHistory || [];
  const first = hist[0];
  const last = hist[hist.length - 1];
  const histDelta =
    first && last ? Math.max(0, first.total - last.total) : 0;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
        <nav className="mb-3 text-xs text-slate-500">
          <Link href="/projetos/" className="hover:text-slate-800">
            Projetos
          </Link>
          <span className="mx-1">/</span>
          <span className="text-slate-800">{project.name}</span>
        </nav>

        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              {project.name}
            </h1>
            {project.description ? (
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                {project.description}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-slate-400">
              Criado {new Date(project.createdAt).toLocaleDateString("pt-PT")} ·
              Actualizado{" "}
              {new Date(project.updatedAt).toLocaleDateString("pt-PT")} ·
              Template {project.templateId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <WatchButton
              kind="PROJECT"
              target={{
                key: project.id,
                label: project.name,
                href: `/projetos/p/?id=${encodeURIComponent(project.id)}`,
              }}
              baseline={baselineFromTotal(summary.total)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void duplicateProject(project.id)}
            >
              Duplicar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void archiveProject(project.id)}
            >
              Arquivar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                if (!project) return;
                const snapshot = JSON.parse(JSON.stringify(project)) as Project;
                void deleteProject(project.id).then(() => {
                  push("Projeto eliminado.", {
                    action: {
                      label: "Anular",
                      onClick: () => {
                        void reinsertProject(snapshot).then(() => {
                          router.push(
                            `/projetos/p/?id=${encodeURIComponent(snapshot.id)}`,
                          );
                        });
                      },
                    },
                  });
                  router.push("/projetos/");
                });
              }}
            >
              Eliminar
            </Button>
          </div>
        </div>

        {/* Sticky summary */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2 sm:hidden">
            <span className="text-sm font-medium text-slate-600">Compatibilidade</span>
            <CompatScoreBadge project={project} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Stat label="Total" value={formatEUR(summary.total)} />
            <Stat label="Mínimo" value={formatEUR(summary.minTotal)} />
            <Stat label="Lojas" value={String(summary.storeCount)} />
            <Stat
              label="Poupança"
              value={
                summary.savingVsInitial > 0
                  ? formatEUR(summary.savingVsInitial)
                  : "—"
              }
              accent={summary.savingVsInitial > 0}
            />
            <Stat label="Promoções" value={String(summary.onSaleCount)} />
            <Stat label="Cupões" value={String(summary.couponCount)} />
            <Stat
              label="Slots"
              value={`${summary.filledSlots}/${summary.filledSlots + summary.emptySlots}`}
            />
          </div>
        </div>

        <div className="mb-6">
          <ProjectCompatHealth project={project} />
        </div>

        <div className="mb-6">
          <EntityActivityTimeline
            kind="PROJECT"
            targetKey={project.id}
            title="Timeline do projeto"
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <Button type="button" variant="outline" size="sm" onClick={copyLink}>
            <Copy className="mr-1 h-3.5 w-3.5" />
            Link
          </Button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Share2 className="mr-1 h-3.5 w-3.5" />
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
            href={`mailto:?subject=${encodeURIComponent(project.name)}&body=${encodeURIComponent(shareUrl)}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Email
          </a>
          <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
            CSV
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportJson}>
            JSON
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportPdf}>
            <FileDown className="mr-1 h-3.5 w-3.5" />
            PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="mr-1 h-3.5 w-3.5" />
            Imprimir
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={async () => {
              const label = window.prompt("Nome do novo slot");
              if (label) {
                await addCustomSlot(project.id, label);
                await reload();
              }
            }}
          >
            + Slot
          </Button>
        </div>
        {msg ? <p className="mb-3 text-xs text-sky-700">{msg}</p> : null}

        {/* Timeline */}
        {hist.length >= 2 ? (
          <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Evolução do total
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {hist.slice(-6).map((h) => (
                <li key={h.date} className="flex justify-between gap-4">
                  <span>
                    {new Date(h.date).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "long",
                    })}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatEUR(h.total)}
                  </span>
                </li>
              ))}
            </ul>
            {histDelta > 0 ? (
              <p className="mt-2 text-sm font-medium text-emerald-700">
                ↓ Poupa {formatEUR(histDelta)} desde o início
              </p>
            ) : null}
          </section>
        ) : null}

        {/* Slots */}
        <ul className="space-y-3">
          {project.slots.map((slot) => {
            const p = slot.product;
            const price = unitPrice(slot);
            const store = p?.offers?.length
              ? [...p.offers].sort((a, b) => a.price - b.price)[0]
              : null;
            const delta = p ? p.priceAtAdd - price : 0;
            return (
              <li
                key={slot.slotId}
                draggable
                onDragStart={() => setDragId(slot.slotId)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void onDrop(slot.slotId)}
                className={cn(
                  "rounded-xl border border-slate-200 bg-white p-3 sm:p-4",
                  dragId === slot.slotId && "opacity-60",
                )}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <label className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      checked={slot.selected}
                      onChange={(e) => {
                        void toggleSlotSelected(
                          project.id,
                          slot.slotId,
                          e.target.checked,
                        ).then(reload);
                      }}
                      aria-label={`Seleccionar ${slot.label}`}
                    />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {slot.label}
                    </span>
                  </label>

                  {p ? (
                    <>
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="max-h-full max-w-full object-contain"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/p/?id=${encodeURIComponent(p.slug)}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {p.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatEUR(price)}
                          {store
                            ? ` · ${storeDisplayName(store.store, store.storeName)}`
                            : ""}
                          {` · Score ${p.lymiarIndex}`}
                          {typeof p.knowledgeCompleteness === "number"
                            ? ` · Ficha ${p.knowledgeCompleteness}%`
                            : ""}
                          {p.priceInsightLabel
                            ? ` · ${p.priceInsightLabel}`
                            : ""}
                          {p.betterAlternativeLabel
                            ? ` · ${p.betterAlternativeLabel}`
                            : ""}
                          {delta > 1 ? (
                            <span className="text-emerald-700">
                              {" "}
                              · ↓ {formatEUR(delta)}
                            </span>
                          ) : null}
                          {p.isOnSale ? " · Promoção" : ""}
                          {p.storeCouponsAvailable ? " · Cupão" : ""}
                        </p>
                        {p.knowledgeAttributes &&
                        Object.keys(p.knowledgeAttributes).length ? (
                          <p className="mt-1 flex flex-wrap gap-1">
                            {Object.entries(p.knowledgeAttributes)
                              .filter(([k]) => k !== "brand")
                              .slice(0, 4)
                              .map(([k, v]) => (
                                <span
                                  key={k}
                                  className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                                >
                                  {k.replace(/_/g, " ")}: {String(v)}
                                </span>
                              ))}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="text-xs font-medium text-sky-700 hover:underline"
                            onClick={() => {
                              setSlotSearch(slot.slotId);
                              setQ("");
                              setResults([]);
                            }}
                          >
                            Trocar
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-600 hover:underline"
                            onClick={async () => {
                              try {
                                const d = await getProductBySlug(p.slug);
                                const prod = detailToProduct(d);
                                addToCompare(productToCompareItem(prod));
                                push("Adicionado ao comparador");
                              } catch {
                                push("Não foi possível comparar");
                              }
                            }}
                          >
                            <GitCompareArrows className="h-3 w-3" />
                            VS
                          </button>
                          <Link
                            href={`/p/?id=${encodeURIComponent(p.slug)}#historico`}
                            className="text-xs text-slate-600 hover:underline"
                          >
                            Histórico
                          </Link>
                          <button
                            type="button"
                            className="text-xs text-slate-500 hover:underline"
                            onClick={() => {
                              void clearSlot(project.id, slot.slotId).then(
                                reload,
                              );
                            }}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                      <p className="font-display text-lg font-bold tabular-nums text-slate-900">
                        {formatEUR(price)}
                      </p>
                    </>
                  ) : (
                    <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-slate-400">Slot vazio</p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setSlotSearch(slot.slotId);
                          setQ("");
                          setResults([]);
                        }}
                      >
                        <Search className="mr-1 h-3.5 w-3.5" />
                        Adicionar Produto
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-center text-xs text-slate-400">
          Compatibilidade CPU/RAM/fonte preparada na arquitectura — validação
          numa fase futura. Total actual {formatEUR(projectTotal(project))}.
        </p>
      </main>

      {/* Search drawer — reuses searchProducts */}
      {slotSearch ? (
        <div
          className="fixed inset-0 z-[80]"
          role="dialog"
          aria-modal
          aria-label="Pesquisar produto"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Fechar"
            onClick={() => setSlotSearch(null)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:inset-x-auto sm:left-1/2 sm:top-[10%] sm:bottom-auto sm:w-[min(32rem,calc(100%-1.5rem))] sm:-translate-x-1/2 sm:rounded-2xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="font-display text-sm font-semibold">
                Adicionar produto
              </h2>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar (pesquisa Lymiar existente)…"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none ring-sky-500 focus:ring-2"
                aria-label="Pesquisar"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {searching ? (
                <li className="px-3 py-6 text-center text-sm text-slate-400">
                  A pesquisar…
                </li>
              ) : null}
              {results.map((prod) => {
                const chips = knowledgeSuggestionChips(prod, 3);
                return (
                <li key={prod.slug}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50"
                    onClick={async () => {
                      try {
                        const d = await getProductBySlug(prod.slug);
                        await setSlotProduct(
                          project.id,
                          slotSearch,
                          detailToProduct(d),
                        );
                      } catch {
                        await setSlotProduct(project.id, slotSearch, prod);
                      }
                      setSlotSearch(null);
                      await reload();
                    }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                      {prod.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={prod.imageUrl}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {prod.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatEUR(prod.currentPrice)} · Índice{" "}
                        {prod.decision.lymiarIndex.value}
                      </span>
                      {chips.length ? (
                        <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                          {chips.join(" · ")}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      <SiteFooter />
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-display text-base font-bold tabular-nums sm:text-lg",
          accent ? "text-emerald-700" : "text-slate-900",
        )}
      >
        {value}
      </p>
    </div>
  );
}
