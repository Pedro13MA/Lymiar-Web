"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  MetricCard,
  StatGrid,
  MiniChart,
  SectionHeader,
} from "@/components/admin/shared";
import { fetchAdminUsers, patchAdminUserRole, type AdminUser } from "@/services/admin/users";
import {
  fetchAdminMetrics,
  fetchAdminMetricsHistory,
  historyToChartPublic,
} from "@/services/admin/metrics";
import type { ChartPoint } from "@/types/admin";

const ROLES = ["user", "editor", "support", "admin"] as const;

type LivePresence = {
  loggedIn: number;
  visitorsActive: number;
  rps: string;
  live: boolean;
  updatedAt: string;
};

function readCount(metrics: Record<string, { value?: Record<string, unknown> | null }>, key: string): number {
  const v = metrics[key]?.value;
  if (typeof v?.count === "number") return v.count;
  if (typeof v?.label === "string" && /^\d+$/.test(v.label)) return Number(v.label);
  return 0;
}

export function UsersAdminView() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [live, setLive] = useState<LivePresence | null>(null);
  const [visitorChart, setVisitorChart] = useState<ChartPoint[]>([]);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetchAdminUsers();
      setUsers(res.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_error");
      setUsers([]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetchAdminMetrics([
          "users_online",
          "visitors_active",
          "requests_per_sec",
        ]);
        if (cancelled) return;
        const m = res.metrics;
        const cpuTs = m.cpu?.collected_at || m.cpu?.collectedAt || "";
        setLive({
          loggedIn: readCount(m, "users_online"),
          visitorsActive: readCount(m, "visitors_active"),
          rps: String(m.requests_per_sec?.value?.label ?? "—"),
          live: !m.users_online?.stale,
          updatedAt: cpuTs
            ? new Date(cpuTs).toLocaleTimeString("pt-PT")
            : new Date().toLocaleTimeString("pt-PT"),
        });
      } catch {
        if (!cancelled) setLive(null);
      }
    };
    void poll();
    const t = setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    void fetchAdminMetricsHistory("visitors_active", 48)
      .then((h) => setVisitorChart(historyToChartPublic(h.points, "count")))
      .catch(() => setVisitorChart([]));
    const t = setInterval(() => {
      void fetchAdminMetricsHistory("visitors_active", 48)
        .then((h) => setVisitorChart(historyToChartPublic(h.points, "count")))
        .catch(() => undefined);
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const onRole = async (userId: string, role: string) => {
    setMsg(null);
    try {
      await patchAdminUserRole(userId, role);
      setMsg("Role actualizada.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "role_error");
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Utilizadores"
        description="Contas registadas, presença em tempo real e gestão de roles."
        breadcrumb={["Control Center", "Utilizadores"]}
        actions={
          <div className="flex items-center gap-3">
            {live && (
              <span
                className={
                  live.live
                    ? "text-xs font-semibold uppercase text-[var(--admin-ok)]"
                    : "text-xs font-semibold uppercase text-[var(--admin-warn)]"
                }
              >
                {live.live ? "LIVE" : "STALE"} · {live.updatedAt}
              </span>
            )}
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-sm"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Actualizar contas
            </button>
          </div>
        }
      />

      <div className="mb-6 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4 text-sm text-[var(--admin-muted)]">
        <p>
          <strong className="text-[var(--admin-text)]">Visitantes activos</strong> = IPs ou contas
          com pedidos à API nos últimos 60s (pesquisa, PDP, login). Páginas 100% estáticas sem API
          não entram neste número.
        </p>
        <p className="mt-1">
          <strong className="text-[var(--admin-text)]">Contas logadas</strong> = utilizadores com
          sessão JWT/cookie válida que chamaram a API no mesmo período.
        </p>
      </div>

      {live && (
        <StatGrid cols={3} className="mb-6">
          <MetricCard
            label="Visitantes activos agora"
            value={String(live.visitorsActive)}
            hint="últimos 60s · API"
            tone="ok"
          />
          <MetricCard
            label="Contas logadas agora"
            value={String(live.loggedIn)}
            hint="sessão activa · 60s"
            tone="neutral"
          />
          <MetricCard label="Requests/s" value={live.rps} hint="média 5s" tone="ok" />
        </StatGrid>
      )}

      {visitorChart.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Presença (última hora)" className="mb-3" />
          <MiniChart title="Visitantes activos" data={visitorChart} color="#0284c7" />
        </section>
      )}

      {msg && <p className="mb-4 text-sm text-[var(--admin-muted)]">{msg}</p>}
      {error ? (
        <EmptyState title="Erro" description={error} />
      ) : busy && !users.length ? (
        <LoadingState />
      ) : !users.length ? (
        <EmptyState title="Sem utilizadores" description="Nenhuma conta na identity DB." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-xs uppercase text-[var(--admin-faint)]">
              <tr>
                <th className="px-4 py-3 text-left">Utilizador</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Provider</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Último login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--admin-border)] last:border-0">
                  <td className="px-4 py-3 font-medium">{u.name || "—"}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 text-xs text-[var(--admin-muted)]">{u.provider || "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => void onRole(u.id, e.target.value)}
                      className="rounded border border-[var(--admin-border)] px-2 py-1 text-xs"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--admin-muted)]">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString("pt-PT") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
