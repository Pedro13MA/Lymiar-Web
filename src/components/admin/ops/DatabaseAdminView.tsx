"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  MetricCard,
  StatGrid,
  SectionHeader,
} from "@/components/admin/shared";
import {
  fetchAdminDatabase,
  fetchAdminDatabaseSamples,
  fetchAdminSystem,
  type DatabaseInfo,
} from "@/services/admin/ops";

const SAMPLE_TABLES = ["products", "offers", "identity_match_candidates", "deal_events"];

export function DatabaseAdminView() {
  const [data, setData] = useState<DatabaseInfo | null>(null);
  const [backups, setBackups] = useState<string[]>([]);
  const [sampleTable, setSampleTable] = useState("products");
  const [samples, setSamples] = useState<{
    columns: string[];
    rows: unknown[][];
  } | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [db, sys] = await Promise.all([fetchAdminDatabase(), fetchAdminSystem()]);
      setData(db);
      setBackups(sys.backups || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_error");
    } finally {
      setBusy(false);
    }
  }, []);

  const loadSamples = useCallback(async (table: string) => {
    try {
      const s = await fetchAdminDatabaseSamples(table, 6);
      setSamples({ columns: s.columns, rows: s.rows });
    } catch {
      setSamples(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadSamples(sampleTable);
  }, [sampleTable, loadSamples]);

  const cat = data?.catalog;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Base de dados"
        description="Tamanho, contagens, amostras e backups hub."
        breadcrumb={["Control Center", "Base de Dados"]}
        actions={
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Actualizar
          </button>
        }
      />
      {error ? <EmptyState title="Erro" description={error} /> : null}
      {busy && !data ? <LoadingState /> : null}
      {cat && (
        <>
          <StatGrid cols={4} className="mb-8">
            <MetricCard label="Tamanho catálogo" value={cat.sizeLabel} hint={cat.path} tone="ok" />
            <MetricCard label="Produtos" value={String(cat.products.total)} tone="ok" />
            <MetricCard label="EAN canónicos" value={String(cat.products.ean)} tone="ok" />
            <MetricCard label="LMSKU isolados" value={String(cat.products.lmsku)} tone="warn" />
          </StatGrid>
          <SectionHeader title="Tabelas principais" className="mb-3" />
          <div className="mb-8 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
            <table className="w-full text-sm">
              <thead className="border-b bg-[var(--admin-surface-2)] text-xs uppercase text-[var(--admin-faint)]">
                <tr>
                  <th className="px-4 py-3 text-left">Tabela</th>
                  <th className="px-4 py-3 text-right">Linhas</th>
                </tr>
              </thead>
              <tbody>
                {(data.tables || []).map((t) => (
                  <tr key={t.table} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{t.table}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {t.count != null ? t.count.toLocaleString("pt-PT") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SectionHeader title="Amostra de dados" className="mb-3" />
          <div className="mb-3 flex flex-wrap gap-2">
            {SAMPLE_TABLES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSampleTable(t)}
                className={
                  sampleTable === t
                    ? "rounded-lg bg-[var(--admin-brand)] px-3 py-1 text-xs text-white"
                    : "rounded-lg border px-3 py-1 text-xs text-[var(--admin-muted)]"
                }
              >
                {t}
              </button>
            ))}
          </div>
          {samples && (
            <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {samples.columns.map((c) => (
                      <th key={c} className="px-2 py-1 text-left font-mono text-[var(--admin-faint)]">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {samples.rows.map((row, i) => (
                    <tr key={i} className="border-t border-[var(--admin-border)]">
                      {row.map((cell, j) => (
                        <td key={j} className="max-w-[200px] truncate px-2 py-1 text-[var(--admin-muted)]">
                          {cell == null ? "—" : String(cell).slice(0, 80)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {backups.length > 0 && (
            <div className="mt-8 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
              <p className="text-xs uppercase text-[var(--admin-faint)]">Backups hub recentes</p>
              <ul className="mt-2 space-y-1 font-mono text-xs text-[var(--admin-muted)]">
                {backups.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-[var(--admin-faint)]">/opt/lymiar/logs/</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
