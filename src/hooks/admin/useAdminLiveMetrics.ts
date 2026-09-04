"use client";

import { useEffect, useState } from "react";
import {
  fetchAdminMetrics,
  metricsToDashboard,
  type AdminMetricsResponse,
} from "@/services/admin/metrics";
import type { AlertItem } from "@/types/admin";

/** Poll métricas para alertas do topbar (5s). */
export function useAdminLiveAlerts(): AlertItem[] {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetchAdminMetrics();
        if (cancelled) return;
        const dash = metricsToDashboard(res.metrics);
        setAlerts(dash.alerts);
      } catch {
        if (!cancelled) setAlerts([]);
      }
    };
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return alerts;
}

/** Poll métricas completas (1s) — dashboard / infra. */
export function useAdminLiveMetrics(intervalMs = 1000) {
  const [metrics, setMetrics] = useState<AdminMetricsResponse["metrics"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetchAdminMetrics();
        if (cancelled) return;
        setMetrics(res.metrics);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "metrics_error");
      }
    };
    void load();
    const t = setInterval(() => void load(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [intervalMs]);

  return { metrics, error };
}
