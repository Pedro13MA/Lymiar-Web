"use client";

import { useEffect, useState } from "react";
import {
  MiniChart,
  PageHeader,
  SectionHeader,
  LoadingState,
} from "@/components/admin/shared";
import {
  fetchAdminMetricsHistory,
  historyToChartPublic,
} from "@/services/admin/metrics";
import type { ChartPoint } from "@/types/admin";

async function loadChart(key: string, valueKey: string): Promise<ChartPoint[]> {
  const res = await fetchAdminMetricsHistory(key, 72);
  return historyToChartPublic(res.points, valueKey);
}

export function AnalyticsAdminView() {
  const [charts, setCharts] = useState<Record<string, ChartPoint[]>>({});
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [rps, online, cpu, ram, newProducts, offers, visitors] = await Promise.all([
          loadChart("requests_per_sec", "count"),
          loadChart("users_online", "count"),
          loadChart("cpu", "pct"),
          loadChart("ram", "pct"),
          loadChart("products_new_24h", "count"),
          loadChart("feeds_quality", "offers"),
          loadChart("visitors_active", "count"),
        ]);
        if (!cancelled) {
          setCharts({ rps, online, cpu, ram, newProducts, offers, visitors });
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    const t = setInterval(() => {
      void loadChart("requests_per_sec", "count").then((rps) =>
        setCharts((c) => ({ ...c, rps })),
      );
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Analytics"
        description="Séries de system_metrics_history — tráfego, utilizadores e catálogo."
        breadcrumb={["Control Center", "Analytics"]}
      />
      {busy ? <LoadingState rows={3} /> : (
        <>
          <SectionHeader title="Tráfego & utilizadores" className="mb-3" />
          <div className="mb-8 grid gap-3 md:grid-cols-2">
            {charts.rps?.length ? <MiniChart title="Requests/s" data={charts.rps} color="#0284c7" /> : null}
            {charts.online?.length ? <MiniChart title="Utilizadores online" data={charts.online} color="#12b76a" /> : null}
          </div>
          <SectionHeader title="Infraestrutura" className="mb-3" />
          <div className="mb-8 grid gap-3 md:grid-cols-2">
            {charts.cpu?.length ? <MiniChart title="CPU %" data={charts.cpu} /> : null}
            {charts.ram?.length ? <MiniChart title="RAM %" data={charts.ram} color="#f5a524" /> : null}
          </div>
          <SectionHeader title="Catálogo" className="mb-3" />
          <div className="grid gap-3 md:grid-cols-2">
            {charts.newProducts?.length ? (
              <MiniChart title="Novos produtos (24h)" data={charts.newProducts} color="#7c3aed" />
            ) : null}
            {charts.offers?.length ? (
              <MiniChart title="Total ofertas" data={charts.offers} color="#12b76a" />
            ) : null}
            {charts.visitors?.length ? (
              <MiniChart title="Visitantes activos" data={charts.visitors} color="#7c3aed" />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
