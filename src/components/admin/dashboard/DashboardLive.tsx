"use client";

import { useEffect, useState } from "react";
import { DashboardView } from "@/components/admin/dashboard/DashboardView";
import { LoadingState } from "@/components/admin/shared";
import {
  buildLiveMeta,
  fetchAdminMetrics,
  fetchDashboardCharts,
  metricsToDashboard,
} from "@/services/admin/metrics";
import type { DashboardFixture, DashboardLiveMeta } from "@/types/admin";

export function DashboardLive() {
  const [data, setData] = useState<DashboardFixture | null>(null);
  const [liveMeta, setLiveMeta] = useState<DashboardLiveMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const load = async () => {
      try {
        const res = await fetchAdminMetrics();
        if (cancelled) return;
        const dash = metricsToDashboard(res.metrics);
        try {
          const charts = await fetchDashboardCharts();
          if (!cancelled) {
            dash.charts = charts;
          }
        } catch {
          /* charts optional */
        }
        setData(dash);
        setLiveMeta(buildLiveMeta(res.metrics));
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "metrics_error");
        setLiveMeta({
          live: false,
          lastUpdateLabel: "—",
          staleCount: 0,
        });
      }
    };

    void load();
    timer = setInterval(() => void load(), 1000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  if (!data) {
    return <LoadingState rows={4} />;
  }

  return (
    <div>
      {error ? (
        <p className="mb-4 text-xs text-[var(--admin-warn)]">
          Cache temporariamente indisponível ({error}). Métricas individuais podem
          aparecer como stale / indisponível.
        </p>
      ) : null}
      <DashboardView data={data} liveMeta={liveMeta ?? undefined} />
    </div>
  );
}
