"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { PageHeader, LoadingState, EmptyState } from "@/components/admin/shared";
import {
  fetchEnrichmentCoverage,
  fetchTaxonomySuspects,
  type EnrichmentCampaignRow,
  type TaxonomySuspectRule,
} from "@/services/admin/enrichment";
import { cn } from "@/lib/utils";

function CoverageBar({ pct }: { pct: number }) {
  const tone =
    pct >= 90 ? "bg-[var(--admin-ok)]" : pct >= 40 ? "bg-[var(--admin-warn)]" : "bg-[var(--admin-critical)]";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--admin-surface-2)]">
      <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export function EnrichmentCoverageView() {
  const [rows, setRows] = useState<EnrichmentCampaignRow[]>([]);
  const [totals, setTotals] = useState({ products: 0, enriched: 0, coveragePct: 0 });
  const [suspects, setSuspects] = useState<TaxonomySuspectRule[]>([]);
  const [suspectTotal, setSuspectTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [cov, tax] = await Promise.all([fetchEnrichmentCoverage(), fetchTaxonomySuspects()]);
      setRows(cov.campaigns);
      setTotals(cov.totals);
      setSuspects(tax.rules);
      setSuspectTotal(tax.summary.suspects);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_error");
      setRows([]);
      setSuspects([]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Conhecimento"
        description="Progresso do enriquecimento e limpeza de taxonomia antes de novos extractors."
        breadcrumb={["Control Center", "Conhecimento"]}
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-sm text-[var(--admin-muted)] hover:bg-[var(--admin-hover)]"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Actualizar
          </button>
        }
      />

      {error ? (
        <EmptyState title="Não foi possível carregar" description={error} />
      ) : busy && !rows.length ? (
        <LoadingState />
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Produtos nas campanhas", String(totals.products)],
              ["Enriquecidos (kv≥1)", String(totals.enriched)],
              ["Cobertura", `${totals.coveragePct}%`],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 shadow-sm"
              >
                <p className="text-xs uppercase tracking-wide text-[var(--admin-faint)]">{k}</p>
                <p className="mt-1 font-display text-2xl font-semibold text-[var(--admin-text)]">{v}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-xs uppercase text-[var(--admin-faint)]">
                <tr>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Produtos</th>
                  <th className="px-4 py-3">Enriquecidos</th>
                  <th className="px-4 py-3">Cobertura</th>
                  <th className="px-4 py-3">Extractor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--admin-border)] last:border-0">
                    <td className="px-4 py-3 font-medium text-[var(--admin-text)]">{r.label}</td>
                    <td className="px-4 py-3 tabular-nums">{r.products.toLocaleString("pt-PT")}</td>
                    <td className="px-4 py-3 tabular-nums">{r.enriched.toLocaleString("pt-PT")}</td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[140px] flex-col gap-1">
                        <span className="tabular-nums font-medium">{r.coveragePct}%</span>
                        <CoverageBar pct={r.coveragePct} />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                      {r.extractorVersion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-[var(--admin-faint)]">
            Enriquecido = produtos com <code>knowledge_version ≥ 1</code> após campanha
            title_extractor (gap-fill; nunca apaga attrs existentes).
          </p>

          <h2 className="mb-2 mt-10 font-display text-lg font-semibold text-[var(--admin-text)]">
            Wave 0.5 · Suspeitos de taxonomia
          </h2>
          <p className="mb-4 text-sm text-[var(--admin-muted)]">
            Heurísticas sobre o título — não reclassificam. Total suspeitos:{" "}
            <span className="tabular-nums font-medium text-[var(--admin-text)]">
              {suspectTotal.toLocaleString("pt-PT")}
            </span>
            . Corrigir leafs antes da Wave 1.
          </p>

          <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-xs uppercase text-[var(--admin-faint)]">
                <tr>
                  <th className="px-4 py-3">Leaf</th>
                  <th className="px-4 py-3">Suspeitos</th>
                  <th className="px-4 py-3">% leaf</th>
                  <th className="px-4 py-3">Regra</th>
                  <th className="px-4 py-3">Sugestão</th>
                </tr>
              </thead>
              <tbody>
                {suspects.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--admin-border)] last:border-0 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--admin-text)]">{r.leaf}</div>
                      <div className="text-xs text-[var(--admin-faint)]">{r.label}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium">
                      {r.suspects.toLocaleString("pt-PT")}
                      <span className="text-[var(--admin-faint)]"> / {r.leafTotal.toLocaleString("pt-PT")}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.suspectPct}%</td>
                    <td className="px-4 py-3 text-[var(--admin-muted)]">{r.rule}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                      {r.suggestedLeaf ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {suspects.some((r) => r.samples.length > 0) ? (
            <div className="mt-6 space-y-4">
              {suspects
                .filter((r) => r.samples.length > 0)
                .map((r) => (
                  <details
                    key={`s-${r.id}`}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3"
                  >
                    <summary className="cursor-pointer text-sm font-medium text-[var(--admin-text)]">
                      Amostras · {r.leaf} ({r.samples.length})
                    </summary>
                    <ul className="mt-3 space-y-2 text-sm text-[var(--admin-muted)]">
                      {r.samples.map((s) => (
                        <li key={s.ean} className="border-t border-[var(--admin-border)] pt-2 first:border-0 first:pt-0">
                          <Link
                            href={`/control-center/produtos/?ean=${encodeURIComponent(s.ean)}`}
                            className="font-mono text-xs text-[var(--admin-brand)] hover:underline"
                          >
                            {s.ean}
                          </Link>
                          <div className="text-[var(--admin-text)]">{s.name}</div>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
