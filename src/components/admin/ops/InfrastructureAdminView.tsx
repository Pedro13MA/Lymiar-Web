"use client";

import { useMemo } from "react";
import {
  HealthCard,
  MetricCard,
  PageHeader,
  SectionHeader,
  StatGrid,
} from "@/components/admin/shared";
import { buildLiveMeta, metricsToDashboard } from "@/services/admin/metrics";
import { useAdminLiveMetrics } from "@/hooks/admin/useAdminLiveMetrics";

function metricLabel(
  metrics: Record<string, { value?: Record<string, unknown> | null }> | undefined,
  key: string,
  fallback = "—",
): string {
  const v = metrics?.[key]?.value;
  if (typeof v?.label === "string") return v.label;
  if (typeof v?.count === "number") return String(v.count);
  return fallback;
}

export function InfrastructureAdminView() {
  const { metrics, error } = useAdminLiveMetrics(2000);
  const dash = useMemo(() => (metrics ? metricsToDashboard(metrics) : null), [metrics]);
  const liveMeta = useMemo(() => (metrics ? buildLiveMeta(metrics) : null), [metrics]);

  const extra = metrics
    ? [
      {
        id: "ssl",
        label: "SSL",
        value: metricLabel(metrics, "ssl"),
      },
      {
        id: "services",
        label: "Serviços",
        value: metricLabel(metrics, "services"),
      },
      {
        id: "errors",
        label: "5xx (1h)",
        value: metricLabel(metrics, "errors_5xx"),
      },
      {
        id: "latency",
        label: "Latência API",
        value: String(metrics.api_status?.value?.latencyMs ?? "—") + " ms",
      },
    ]
    : [];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Infraestrutura"
        description="CPU, memória, disco, SSL, serviços — poll 2s."
        breadcrumb={["Control Center", "Infraestrutura"]}
        actions={
          liveMeta && (
            <span
              className={
                liveMeta.live
                  ? "text-xs font-semibold uppercase text-[var(--admin-ok)]"
                  : "text-xs font-semibold uppercase text-[var(--admin-warn)]"
              }
            >
              {liveMeta.live ? "LIVE" : "STALE"} · {liveMeta.lastUpdateLabel}
            </span>
          )
        }
      />
      {error && <p className="mb-4 text-sm text-[var(--admin-warn)]">Métricas: {error}</p>}
      {!dash ? (
        <p className="text-sm text-[var(--admin-muted)]">A carregar métricas…</p>
      ) : (
        <>
          <SectionHeader title="Recursos do servidor" className="mb-3" />
          <StatGrid cols={7}>
            {dash.infrastructure.map((item) => (
              <HealthCard key={item.id} {...item} />
            ))}
          </StatGrid>
          <SectionHeader title="Serviços & segurança" className="mb-3 mt-8" />
          <StatGrid cols={4}>
            {extra.map((e) => (
              <MetricCard key={e.id} label={e.label} value={e.value} tone="ok" />
            ))}
          </StatGrid>
          <SectionHeader title="Tráfego & catálogo" className="mb-3 mt-8" />
          <StatGrid cols={6}>
            {dash.quickMetrics.map((m) => (
              <MetricCard key={m.id} {...m} />
            ))}
          </StatGrid>
        </>
      )}
    </div>
  );
}
