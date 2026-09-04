"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Package,
  Save,
  Search,
} from "lucide-react";
import { PageHeader, Tabs, LoadingState, EmptyState } from "@/components/admin/shared";
import {
  fetchAdminProduct,
  formatEuro,
  patchAdminProduct,
  searchAdminProducts,
  type FieldQuality,
  type ProductDetail,
  type ProductSearchRow,
  type KnowledgeItem,
  type KnowledgeCoverage,
} from "@/services/admin/products";
import { cn } from "@/lib/utils";
import { QuickProductEdit } from "@/components/admin/products/QuickProductEdit";
import { fetchAdminAudit, type AuditEntry } from "@/services/admin/audit";
import Link from "next/link";

function normalizeKnowledge(
  raw: ProductDetail["knowledgeCoverage"],
): {
  profileLabel: string | null;
  message: string | null;
  knowledgeKind: string | null;
  items: KnowledgeItem[];
} {
  if (!raw) return { profileLabel: null, message: null, knowledgeKind: null, items: [] };
  if (Array.isArray(raw))
    return { profileLabel: null, message: null, knowledgeKind: null, items: raw };
  const cov = raw as KnowledgeCoverage;
  return {
    profileLabel: cov.profileLabel ?? null,
    message: cov.message ?? null,
    knowledgeKind: cov.knowledgeKind ?? null,
    items: cov.items || [],
  };
}

const TABS = [
  { id: "resumo", label: "Resumo" },
  { id: "bd", label: "Base de Dados" },
  { id: "ofertas", label: "Ofertas" },
  { id: "historico", label: "Histórico" },
  { id: "editar", label: "Editar" },
];

function StatusDot({ status }: { status: FieldQuality["status"] }) {
  const color =
    status === "filled"
      ? "bg-[var(--admin-ok)]"
      : status === "partial"
        ? "bg-[var(--admin-warn)]"
        : "bg-[var(--admin-critical)]";
  const label =
    status === "filled" ? "preenchida" : status === "partial" ? "parcial" : "vazia";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--admin-muted)]">
      <span className={cn("h-2 w-2 rounded-full", color)} title={label} />
      {label}
    </span>
  );
}

function cell(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

export function ProductsAdminView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eanParam = searchParams.get("ean") || "";

  const [q, setQ] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterLeaf, setFilterLeaf] = useState("");
  const [recentEdits, setRecentEdits] = useState<AuditEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProductSearchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [tab, setTab] = useState("resumo");
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const openEan = useCallback(
    (ean: string) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (ean) sp.set("ean", ean);
      else sp.delete("ean");
      router.replace(`${pathname}?${sp.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const runSearch = useCallback(async (query: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await searchAdminProducts({
        q: query,
        brand: filterBrand.trim() || undefined,
        category: filterLeaf.trim() || undefined,
        limit: 40,
      });
      setRows(res.products);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "search_error");
      setRows([]);
      setTotal(0);
    } finally {
      setBusy(false);
    }
  }, [filterBrand, filterLeaf]);

  useEffect(() => {
    void fetchAdminAudit({ resource: "ean", limit: 20 })
      .then((r) =>
        setRecentEdits(r.entries.filter((e) => e.action === "product.update")),
      )
      .catch(() => setRecentEdits([]));
  }, [detail?.ean]);

  useEffect(() => {
    void runSearch("");
  }, [runSearch]);

  useEffect(() => {
    if (!eanParam) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailBusy(true);
    setSaveMsg(null);
    void fetchAdminProduct(eanParam)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        const draft: Record<string, string> = {};
        for (const [k, v] of Object.entries(d.product)) {
          if (k === "ean") continue;
          draft[k] =
            v == null
              ? ""
              : typeof v === "object"
                ? JSON.stringify(v, null, 2)
                : String(v);
        }
        setEditDraft(draft);
        setTab("resumo");
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "detail_error");
      })
      .finally(() => {
        if (!cancelled) setDetailBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eanParam]);

  const onSave = async () => {
    if (!detail) return;
    setSaveMsg(null);
    const fields: Record<string, unknown> = {};
    for (const [k, raw] of Object.entries(editDraft)) {
      const original = detail.product[k];
      let next: unknown = raw;
      if (raw.trim() === "") next = null;
      else if (
        typeof original === "number" ||
        (original == null && /^-?\d+(\.\d+)?$/.test(raw.trim()))
      ) {
        next = Number(raw);
      } else if (
        (typeof original === "object" && original !== null) ||
        (raw.trim().startsWith("{") || raw.trim().startsWith("["))
      ) {
        try {
          next = JSON.parse(raw);
        } catch {
          setSaveMsg(`JSON inválido em ${k}`);
          return;
        }
      }
      const origStr =
        original == null
          ? ""
          : typeof original === "object"
            ? JSON.stringify(original, null, 2)
            : String(original);
      if (raw !== origStr) fields[k] = next;
    }
    if (!Object.keys(fields).length) {
      setSaveMsg("Sem alterações.");
      return;
    }
    setBusy(true);
    try {
      const res = await patchAdminProduct(detail.ean, fields);
      setSaveMsg(res.changed ? "Guardado na BD (+ audit log)." : "Sem alterações.");
      const fresh = await fetchAdminProduct(detail.ean);
      setDetail(fresh);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "save_error");
    } finally {
      setBusy(false);
    }
  };

  const qualityLabel = useMemo(() => {
    if (!detail) return "";
    return `${detail.quality.qualityPct}% · ${detail.quality.counts.filled} ok · ${detail.quality.counts.partial} parcial · ${detail.quality.counts.empty} vazias`;
  }, [detail]);

  if (eanParam) {
    return (
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => openEan("")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--admin-muted)] hover:text-[var(--admin-brand)]"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar à pesquisa
        </button>

        {detailBusy || !detail ? (
          <LoadingState rows={5} />
        ) : (
          <>
            <PageHeader
              title={detail.summary.name || detail.ean}
              description={`${detail.summary.brand || "—"} · ${detail.ean}`}
              breadcrumb={["Control Center", "Produtos", detail.ean]}
              actions={
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--admin-muted)]">
                  <span className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1">
                    Qualidade{" "}
                    {detail.sectionScores?.overallPct ?? detail.summary.qualityPct}%
                  </span>
                  <span className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1">
                    {detail.summary.offerCount} ofertas
                  </span>
                  <span className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1">
                    Melhor {formatEuro(detail.summary.bestPrice)}
                  </span>
                </div>
              }
            />

            <QuickProductEdit
              ean={detail.ean}
              canonicalName={detail.summary.name}
              brand={detail.summary.brand}
              canonicalModel={
                (detail.product.canonical_model as string | null) ?? null
              }
              onSaved={() => {
                void fetchAdminProduct(detail.ean).then(setDetail);
              }}
            />

            <Tabs tabs={TABS} value={tab} onChange={setTab} className="mb-6" />

            {tab === "resumo" ? (
              <ResumoTab detail={detail} onOpenEan={openEan} />
            ) : null}
            {tab === "bd" ? (
              <DatabaseTab fields={detail.quality.fields} qualityLabel={qualityLabel} />
            ) : null}
            {tab === "ofertas" ? <OffersTab offers={detail.offers} /> : null}
            {tab === "historico" ? (
              <HistoryTab history={detail.history} events={detail.dealEvents} />
            ) : null}
            {tab === "editar" ? (
              <EditTab
                draft={editDraft}
                setDraft={setEditDraft}
                onSave={() => void onSave()}
                busy={busy}
                message={saveMsg}
              />
            ) : null}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Produtos"
        description="Pesquisa por EAN, nome, marca, modelo, SKU, MPN ou categoria."
        breadcrumb={["Control Center", "Produtos"]}
      />

      <form
        className="mb-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(q);
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-faint)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="EAN, nome, marca, modelo, SKU, MPN…"
              className="h-11 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] pl-10 pr-3 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-brand)]/40 focus:ring-1 focus:ring-[var(--admin-brand)]/20"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--admin-brand)] px-5 text-sm font-semibold text-white hover:bg-[var(--admin-brand-deep)] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Pesquisar
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            placeholder="Filtrar marca"
            className="h-9 rounded-lg border border-[var(--admin-border)] px-3 text-sm"
          />
          <input
            value={filterLeaf}
            onChange={(e) => setFilterLeaf(e.target.value)}
            placeholder="Filtrar leaf / categoria"
            className="h-9 rounded-lg border border-[var(--admin-border)] px-3 text-sm"
          />
        </div>
      </form>

      {error ? (
        <p className="mb-4 text-sm text-[var(--admin-critical)]">{error}</p>
      ) : null}

      <p className="mb-3 text-xs text-[var(--admin-faint)]">
        {total.toLocaleString("pt-PT")} resultado(s)
      </p>

      {busy && !rows.length ? (
        <LoadingState rows={4} />
      ) : !rows.length ? (
        <EmptyState
          title="Sem produtos"
          description="Ajusta a pesquisa ou verifica o catálogo."
          icon={<Package className="h-5 w-5" />}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-xs uppercase tracking-wide text-[var(--admin-faint)]">
              <tr>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">EAN</th>
                <th className="px-4 py-3 font-medium">Marca</th>
                <th className="px-4 py-3 font-medium">SKU / MPN</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Ofertas</th>
                <th className="px-4 py-3 font-medium">Melhor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.ean}
                  className="cursor-pointer border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-hover)]"
                  onClick={() => openEan(r.ean)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--admin-text)]">
                      {r.canonical_name || "—"}
                    </p>
                    <p className="text-xs text-[var(--admin-faint)]">
                      {r.canonical_model || r.family || ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.ean}</td>
                  <td className="px-4 py-3">{r.brand || r.brand_normalized || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[var(--admin-muted)]">
                    {r.sku || "—"}
                    <br />
                    {r.mpn || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.category || r.leaf_id || "—"}
                  </td>
                  <td className="px-4 py-3">{r.offerCount}</td>
                  <td className="px-4 py-3 font-medium">{formatEuro(r.bestPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recentEdits.length > 0 && (
        <div className="mt-8 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
          <p className="text-xs font-medium uppercase text-[var(--admin-faint)]">
            Últimas edições (audit)
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {recentEdits.slice(0, 8).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--admin-muted)]">
                  {new Date(e.createdAt).toLocaleString("pt-PT")}
                </span>
                <Link
                  href={`/control-center/produtos/?ean=${encodeURIComponent(e.resourceId || "")}`}
                  className="font-mono text-xs text-[var(--admin-brand)] hover:underline"
                >
                  {e.resourceId}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ToneDot({ tone }: { tone: "ok" | "warn" | "critical" | "na" }) {
  const color =
    tone === "ok"
      ? "bg-[var(--admin-ok)]"
      : tone === "warn"
        ? "bg-[var(--admin-warn)]"
        : tone === "na"
          ? "bg-[var(--admin-faint)]"
          : "bg-[var(--admin-critical)]";
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", color)} />;
}

function ImpactStars({ n }: { n: number }) {
  const v = Math.max(0, Math.min(5, Math.round(n)));
  return (
    <span className="tracking-tight text-[var(--admin-brand)]" title={`Impacto ${v}/5`}>
      {"★".repeat(v)}
      <span className="text-[var(--admin-faint)]">{"★".repeat(5 - v)}</span>
    </span>
  );
}

function formatWhen(at: string): string {
  try {
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return at;
    return d.toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "short",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return at;
  }
}

function ResumoTab({
  detail,
  onOpenEan,
}: {
  detail: ProductDetail;
  onOpenEan: (ean: string) => void;
}) {
  const s = detail.summary;
  const d = detail.decision;
  const scores = detail.sectionScores;
  const diagnostics = detail.diagnostics || [];
  const knowledge = normalizeKnowledge(detail.knowledgeCoverage);
  const timeline = detail.timeline || [];
  const relations = detail.relations;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Score por secção */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm lg:col-span-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
            Score por secção
          </h3>
          {scores ? (
            <p className="font-display text-2xl font-semibold text-[var(--admin-text)]">
              Qualidade Geral{" "}
              <span className="text-[var(--admin-brand)]">{scores.overallPct}%</span>
            </p>
          ) : null}
        </div>
        {scores?.sections?.length ? (
          <ul className="mt-5 space-y-2.5">
            {scores.sections.map((sec) => (
              <li
                key={sec.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex items-center gap-2 text-[var(--admin-text)]">
                  <ToneDot tone={sec.tone} />
                  {sec.label}
                </span>
                <span className="tabular-nums font-medium text-[var(--admin-muted)]">
                  {sec.applicable === false || sec.pct == null
                    ? "n/a"
                    : `${sec.pct}%`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[var(--admin-muted)]">Sem scores de secção.</p>
        )}
        <dl className="mt-6 grid gap-3 border-t border-[var(--admin-border)] pt-4 sm:grid-cols-2">
          {[
            ["Colunas preenchidas", `${s.qualityPct}%`],
            ["Estado", s.state],
            ["Ofertas", String(s.offerCount)],
            ["Melhor preço", formatEuro(s.bestPrice)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-[var(--admin-faint)]">{k}</dt>
              <dd className="mt-0.5 text-sm font-medium text-[var(--admin-text)]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
          Decisão Lymiar
        </h3>
        <p className="mt-3 font-display text-2xl font-semibold text-[var(--admin-text)]">
          {d.label}
        </p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">veredicto: {d.verdict}</p>
        <p className="mt-4 text-xs leading-relaxed text-[var(--admin-faint)]">{d.note}</p>
      </div>

      {/* Diagnóstico */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm lg:col-span-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
          Diagnóstico
        </h3>
        {!diagnostics.length ? (
          <p className="mt-4 text-sm text-[var(--admin-ok)]">
            Sem bloqueios óbvios detectados a partir dos dados observados.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {diagnostics.map((issue) => (
              <li
                key={issue.id}
                className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4"
              >
                <p className="text-sm font-semibold text-[var(--admin-text)]">
                  {issue.severity ? "❌ " : "⚠ "}
                  {issue.title}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
                  Motivo
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-[var(--admin-muted)]">
                  {issue.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
                  Como corrigir
                  {issue.categoryLabel ? (
                    <span className="ml-2 font-normal normal-case tracking-normal text-[var(--admin-muted)]">
                      · Categoria: {issue.categoryLabel}
                    </span>
                  ) : null}
                </p>
                {(issue.fixesHigh?.length || issue.fixesMedium?.length) ? (
                  <div className="mt-1 space-y-3 text-sm text-[var(--admin-text)]">
                    {issue.fixesHigh?.length ? (
                      <div>
                        <p className="text-xs text-[var(--admin-faint)]">Prioridade alta</p>
                        <ul className="mt-0.5 space-y-0.5">
                          {issue.fixesHigh.map((f) => (
                            <li key={f}>✓ {f}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {issue.fixesMedium?.length ? (
                      <div>
                        <p className="text-xs text-[var(--admin-faint)]">Prioridade média</p>
                        <ul className="mt-0.5 space-y-0.5">
                          {issue.fixesMedium.map((f) => (
                            <li key={f}>✓ {f}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <ul className="mt-1 space-y-0.5 text-sm text-[var(--admin-text)]">
                    {issue.fixes.map((f) => (
                      <li key={f}>✓ {f}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Knowledge coverage */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
          Knowledge Coverage
        </h3>
        {knowledge.profileLabel ? (
          <p className="mt-2 text-sm font-medium text-[var(--admin-text)]">
            {knowledge.profileLabel}
          </p>
        ) : null}
        {knowledge.message ? (
          <p className="mt-3 text-sm leading-relaxed text-[var(--admin-muted)]">
            {knowledge.message}
          </p>
        ) : null}
        <ul className="mt-4 space-y-2">
          {knowledge.items.map((k) => (
            <li
              key={k.label}
              className="flex items-center justify-between gap-2 text-sm"
              title={k.source || undefined}
            >
              <span className="text-[var(--admin-text)]">{k.label}</span>
              <span
                className={
                  k.present ? "text-[var(--admin-ok)]" : "text-[var(--admin-critical)]"
                }
              >
                {k.present ? "✔" : "✘"}
              </span>
            </li>
          ))}
          {!knowledge.items.length ? (
            <li className="text-sm text-[var(--admin-muted)]">Sem cobertura disponível.</li>
          ) : null}
        </ul>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
          Timeline
        </h3>
        {!timeline.length ? (
          <p className="mt-4 text-sm text-[var(--admin-muted)]">Sem eventos datados.</p>
        ) : (
          <ol className="mt-4 space-y-0">
            {timeline.map((ev, i) => (
              <li key={`${ev.at}-${ev.title}-${i}`} className="relative pl-4">
                {i < timeline.length - 1 ? (
                  <span className="absolute bottom-0 left-[5px] top-3 w-px bg-[var(--admin-border)]" />
                ) : null}
                <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--admin-brand)] bg-[var(--admin-surface)]" />
                <p className="text-xs text-[var(--admin-faint)]">{formatWhen(ev.at)}</p>
                <p className="text-sm font-medium text-[var(--admin-text)]">{ev.title}</p>
                {ev.detail ? (
                  <p className="text-xs text-[var(--admin-muted)]">{ev.detail}</p>
                ) : null}
                {i < timeline.length - 1 ? <div className="h-4" /> : null}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Relações */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm lg:col-span-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
          Relações
        </h3>
        {!relations ? (
          <p className="mt-4 text-sm text-[var(--admin-muted)]">Sem relações.</p>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
                Mesmo modelo
              </p>
              {relations.sameModel.length ? (
                <ul className="mt-2 space-y-1.5">
                  {relations.sameModel.map((p) => (
                    <li key={p.ean}>
                      <button
                        type="button"
                        className="text-left text-sm text-[var(--admin-brand)] hover:underline"
                        onClick={() => onOpenEan(p.ean)}
                      >
                        {p.canonical_name || p.ean}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[var(--admin-muted)]">Nenhum.</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
                Mesmo EAN
              </p>
              <p className="mt-2 text-sm text-[var(--admin-text)]">
                {relations.sameEanOffers} oferta
                {relations.sameEanOffers === 1 ? "" : "s"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
                Mesmo canonical_group
              </p>
              <p className="mt-2 text-sm text-[var(--admin-text)]">
                {relations.sameGroupCount
                  ? `${relations.sameGroupCount} produto${relations.sameGroupCount === 1 ? "" : "s"}`
                  : "—"}
              </p>
              {relations.sameGroup.length ? (
                <ul className="mt-2 space-y-1.5">
                  {relations.sameGroup.slice(0, 6).map((p) => (
                    <li key={p.ean}>
                      <button
                        type="button"
                        className="text-left text-sm text-[var(--admin-brand)] hover:underline"
                        onClick={() => onOpenEan(p.ean)}
                      >
                        {p.canonical_name || p.ean}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm lg:col-span-3">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-faint)]">
          Histórico de preços (resumo diário)
        </h3>
        {detail.history.daily.length ? (
          <div className="flex gap-1 overflow-x-auto pb-2">
            {detail.history.daily.slice(-40).map((day, i) => {
              const p = Number(day.last_price ?? day.min_price ?? 0);
              const max = Math.max(
                ...detail.history.daily.map((d) =>
                  Number(d.max_price ?? d.last_price ?? 1),
                ),
                1,
              );
              const h = Math.max(8, Math.round((p / max) * 64));
              return (
                <div
                  key={`${day.date}-${day.retailer}-${i}`}
                  className="flex w-3 flex-col items-center justify-end"
                  title={`${day.date} · ${formatEuro(p)}`}
                >
                  <div
                    className="w-full rounded-sm bg-[var(--admin-brand)]/80"
                    style={{ height: h }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--admin-muted)]">Sem barras diárias.</p>
        )}
      </div>
    </div>
  );
}

function DatabaseTab({
  fields,
  qualityLabel,
}: {
  fields: FieldQuality[];
  qualityLabel: string;
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-[var(--admin-muted)]">{qualityLabel}</p>
      <div className="space-y-3">
        {fields.map((f) => (
          <div
            key={f.column}
            className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-semibold text-[var(--admin-text)]">
                  {f.column}
                </p>
                <div className="mt-1.5">
                  <StatusDot status={f.status} />
                </div>
              </div>
              {f.impact != null ? (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--admin-faint)]">
                    Impacto
                  </p>
                  <ImpactStars n={f.impact} />
                </div>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--admin-faint)]">
                  Valor
                </p>
                <p className="mt-0.5 break-all font-mono text-xs text-[var(--admin-muted)]">
                  {cell(f.value)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--admin-faint)]">
                  Cobertura BD
                </p>
                <p className="mt-0.5 text-sm font-medium text-[var(--admin-text)]">
                  {f.catalogCoveragePct != null ? `${f.catalogCoveragePct}%` : "—"}
                </p>
              </div>
            </div>
            {f.usedIn?.length ? (
              <div className="mt-3 border-t border-[var(--admin-border)] pt-3">
                <p className="text-[10px] uppercase tracking-wide text-[var(--admin-faint)]">
                  Usado em
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--admin-muted)]">
                  {f.usedIn.map((u) => (
                    <li key={u}>✔ {u}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function OffersTab({ offers }: { offers: Record<string, unknown>[] }) {
  if (!offers.length) {
    return (
      <EmptyState
        title="Sem ofertas"
        description="Nenhuma linha em offers para este EAN."
        icon={<Package className="h-5 w-5" />}
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-xs uppercase text-[var(--admin-faint)]">
          <tr>
            <th className="px-4 py-3">Loja</th>
            <th className="px-4 py-3">Preço</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">MPN</th>
            <th className="px-4 py-3">Cupão / promo</th>
            <th className="px-4 py-3">Actualizado</th>
            <th className="px-4 py-3">URL</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((o, i) => (
            <tr
              key={String(o.id ?? i)}
              className="border-b border-[var(--admin-border)] last:border-0"
            >
              <td className="px-4 py-3 font-medium">{cell(o.store)}</td>
              <td className="px-4 py-3">
                {formatEuro(o.price as number)}
                {o.original_price ? (
                  <span className="ml-1 text-xs text-[var(--admin-faint)] line-through">
                    {formatEuro(o.original_price as number)}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-xs">
                {o.in_stock == null ? "—" : Number(o.in_stock) ? "Em stock" : "Sem stock"}
              </td>
              <td className="px-4 py-3 font-mono text-xs">{cell(o.sku)}</td>
              <td className="px-4 py-3 font-mono text-xs">{cell(o.mpn)}</td>
              <td className="max-w-[180px] truncate px-4 py-3 text-xs">
                {cell(o.promotional_text)}
              </td>
              <td className="px-4 py-3 text-xs text-[var(--admin-faint)]">
                {cell(o.last_checked_at || o.recorded_at)}
              </td>
              <td className="px-4 py-3">
                {typeof o.url === "string" && o.url ? (
                  <a
                    href={o.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--admin-brand)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Abrir
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTab({
  history,
  events,
}: {
  history: ProductDetail["history"];
  events: Record<string, unknown>[];
}) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-[var(--admin-text)]">
          Alterações / ticks
        </h3>
        {!history.ticks.length ? (
          <p className="text-sm text-[var(--admin-muted)]">Sem price_history recente.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-xs uppercase text-[var(--admin-faint)]">
                <tr>
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4 py-3">Loja</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Cupão</th>
                  <th className="px-4 py-3">Stock</th>
                </tr>
              </thead>
              <tbody>
                {history.ticks.map((t, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--admin-border)] last:border-0"
                  >
                    <td className="px-4 py-2 text-xs">{cell(t.recorded_at)}</td>
                    <td className="px-4 py-2">{cell(t.retailer)}</td>
                    <td className="px-4 py-2">{formatEuro(t.current_price as number)}</td>
                    <td className="px-4 py-2 text-xs">
                      {cell(t.coupon_code)}{" "}
                      {t.coupon_price != null ? formatEuro(t.coupon_price as number) : ""}
                    </td>
                    <td className="px-4 py-2 text-xs">{cell(t.stock)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-[var(--admin-text)]">
          Deal events / timeline
        </h3>
        {!events.length ? (
          <p className="text-sm text-[var(--admin-muted)]">Sem deal events na BD.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((ev, i) => (
              <li
                key={i}
                className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3 text-xs text-[var(--admin-muted)]"
              >
                <pre className="whitespace-pre-wrap break-all font-mono">
                  {JSON.stringify(ev, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EditTab({
  draft,
  setDraft,
  onSave,
  busy,
  message,
}: {
  draft: Record<string, string>;
  setDraft: (v: Record<string, string>) => void;
  onSave: () => void;
  busy: boolean;
  message: string | null;
}) {
  const keys = Object.keys(draft).sort();
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--admin-brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--admin-brand-deep)] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar na BD
        </button>
        {message ? (
          <span className="text-sm text-[var(--admin-muted)]">{message}</span>
        ) : (
          <span className="text-xs text-[var(--admin-faint)]">
            Cada alteração fica em admin_audit_log.
          </span>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {keys.map((k) => (
          <label key={k} className="block">
            <span className="mb-1 block font-mono text-[11px] text-[var(--admin-faint)]">
              {k}
            </span>
            {draft[k].length > 80 || draft[k].includes("\n") ? (
              <textarea
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 font-mono text-xs text-[var(--admin-text)] outline-none focus:border-[var(--admin-brand)]/40"
              />
            ) : (
              <input
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                className="h-10 w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-brand)]/40"
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
