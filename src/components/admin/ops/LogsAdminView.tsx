"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader, LoadingState, EmptyState, Tabs } from "@/components/admin/shared";
import { fetchAdminLogs, type LogsInfo } from "@/services/admin/ops";
import { fetchAdminAudit, type AuditEntry } from "@/services/admin/audit";

export function LogsAdminView() {
  const [tab, setTab] = useState("audit");
  const [logs, setLogs] = useState<LogsInfo | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState("");
  const [logSearch, setLogSearch] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [l, a] = await Promise.all([
        fetchAdminLogs(200),
        fetchAdminAudit({ limit: 120 }),
      ]);
      setLogs(l);
      setAudit(a.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_error");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredAudit = useMemo(() => {
    const q = auditFilter.trim().toLowerCase();
    if (!q) return audit;
    return audit.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        e.resource.toLowerCase().includes(q) ||
        (e.resourceId || "").toLowerCase().includes(q),
    );
  }, [audit, auditFilter]);

  const filteredLogLines = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    const lines = logs?.lines || [];
    if (!q) return lines;
    return lines.filter((ln) => ln.toLowerCase().includes(q));
  }, [logs, logSearch]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Logs & auditoria"
        description="Acções de admin, tail da API e filtro por texto."
        breadcrumb={["Control Center", "Logs"]}
        actions={
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Actualizar
          </button>
        }
      />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "audit", label: "Auditoria admin" },
          { id: "api", label: "Log API" },
          { id: "errors", label: "Erros" },
        ]}
      />
      {tab === "audit" && (
        <input
          value={auditFilter}
          onChange={(e) => setAuditFilter(e.target.value)}
          placeholder="Filtrar acção, recurso, EAN…"
          className="mb-4 w-full max-w-md rounded-lg border px-3 py-2 text-sm"
        />
      )}
      {tab === "api" && (
        <input
          value={logSearch}
          onChange={(e) => setLogSearch(e.target.value)}
          placeholder="Filtrar linhas do log…"
          className="mb-4 w-full max-w-md rounded-lg border px-3 py-2 text-sm"
        />
      )}
      {error ? <EmptyState title="Erro" description={error} /> : null}
      {busy && !logs ? <LoadingState /> : null}
      {tab === "audit" && !busy && (
        <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          <table className="w-full text-sm">
            <thead className="border-b bg-[var(--admin-surface-2)] text-xs uppercase text-[var(--admin-faint)]">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Acção</th>
                <th className="px-4 py-3">Recurso</th>
                <th className="px-4 py-3">ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudit.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-xs text-[var(--admin-muted)]">
                    {new Date(e.createdAt).toLocaleString("pt-PT")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-3">{e.resource}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e.resourceId || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "errors" && (
        <pre className="max-h-[60vh] overflow-auto rounded-xl border bg-slate-950 p-4 text-xs text-red-300">
          {(logs?.errorLines || []).join("\n") || "Sem erros recentes."}
        </pre>
      )}
      {tab === "api" && (
        <pre className="max-h-[60vh] overflow-auto rounded-xl border bg-slate-950 p-4 text-xs text-slate-200">
          {filteredLogLines.join("\n") || "Log indisponível."}
        </pre>
      )}
    </div>
  );
}
