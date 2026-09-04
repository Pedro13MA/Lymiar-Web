/** Cliente admin — lê cache system_metrics (sem auditorias). */

import { getApiBaseUrl } from "@/lib/api-base-url";
import { getStoredToken } from "@/lib/auth/session";
import type {
  AlertItem,
  DashboardFixture,
  DashboardLiveMeta,
  HealthItem,
  HealthTone,
  MetricCardData,
  PlatformOverview,
} from "@/types/admin";

export type SystemMetricEntry = {
  key: string;
  value: Record<string, unknown> | null;
  collected_at?: string;
  collectedAt?: string;
  age_ms?: number | null;
  ageMs?: number | null;
  cadence: string;
  source: string | null;
  ttl_ms?: number;
  ttlMs?: number;
  stale?: boolean;
  available?: boolean;
};

export type AdminMetricsResponse = {
  ok: boolean;
  source: string;
  count: number;
  metrics: Record<string, SystemMetricEntry>;
};

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchAdminMetrics(
  keys?: string[],
): Promise<AdminMetricsResponse> {
  const base = getApiBaseUrl();
  const q = keys?.length ? `?keys=${encodeURIComponent(keys.join(","))}` : "";
  const res = await fetch(`${base}/api/admin/metrics${q}`, {
    headers: authHeaders(),
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`metrics_http_${res.status}`);
  }
  return res.json() as Promise<AdminMetricsResponse>;
}

export type MetricsHistoryPoint = {
  key: string;
  value: Record<string, unknown> | null;
  collected_at?: string;
  collectedAt?: string;
  cadence?: string;
};

export async function fetchAdminMetricsHistory(
  key: string,
  limit = 60,
): Promise<{ ok: boolean; key: string; points: MetricsHistoryPoint[] }> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/api/admin/metrics/history/${encodeURIComponent(key)}?limit=${limit}`,
    {
      headers: authHeaders(),
      credentials: "include",
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`metrics_history_http_${res.status}`);
  return res.json();
}

function historyToChart(
  points: MetricsHistoryPoint[],
  valueKey: string = "pct",
): import("@/types/admin").ChartPoint[] {
  const ordered = [...points].reverse();
  return ordered.map((p) => {
    const v = p.value;
    let num = 0;
    if (typeof v?.[valueKey] === "number") num = v[valueKey] as number;
    else if (typeof v?.count === "number") num = v.count as number;
    else if (typeof v?.label === "string" && /^[\d.]+$/.test(v.label)) num = Number(v.label);
    const ts = p.collected_at || p.collectedAt || "";
    const label = ts
      ? new Date(ts).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
      : "";
    return { label, value: num };
  });
}

export function historyToChartPublic(
  points: MetricsHistoryPoint[],
  valueKey: string = "pct",
): import("@/types/admin").ChartPoint[] {
  return historyToChart(points, valueKey);
}

export async function fetchDashboardCharts(): Promise<{
  products: import("@/types/admin").ChartPoint[];
  offers: import("@/types/admin").ChartPoint[];
  visits: import("@/types/admin").ChartPoint[];
  accounts: import("@/types/admin").ChartPoint[];
}> {
  const [stats, feeds, users, rps] = await Promise.all([
    fetchAdminMetricsHistory("stats_quick", 48).catch(() => ({ points: [] })),
    fetchAdminMetricsHistory("feeds_quality", 48).catch(() => ({ points: [] })),
    fetchAdminMetricsHistory("users_online", 48).catch(() => ({ points: [] })),
    fetchAdminMetricsHistory("requests_per_sec", 48).catch(() => ({ points: [] })),
  ]);
  const productPoints = stats.points.map((p) => ({
    ...p,
    value:
      (p.value?.products as Record<string, unknown> | undefined) ??
      (p.value as Record<string, unknown> | null),
  }));
  return {
    products: historyToChart(productPoints, "count"),
    offers: historyToChart(feeds.points, "offers"),
    visits: historyToChart(rps.points, "count"),
    accounts: historyToChart(users.points, "count"),
  };
}

function collectedOf(m: SystemMetricEntry | undefined): string {
  return m?.collected_at || m?.collectedAt || "";
}
function toneOf(v: Record<string, unknown> | null | undefined): HealthTone {
  const t = String(v?.tone || "neutral");
  if (t === "ok" || t === "warn" || t === "critical" || t === "neutral") return t;
  return "neutral";
}

function labelOf(v: Record<string, unknown> | null | undefined, fallback = "—"): string {
  if (!v) return fallback;
  if (typeof v.label === "string" && v.label) return v.label;
  if (typeof v.value === "string") return v.value;
  if (typeof v.count === "number") return String(v.count);
  if (typeof v.pct === "number") return `${Math.round(v.pct)}%`;
  return fallback;
}

function pctOf(v: Record<string, unknown> | null | undefined): number | undefined {
  if (typeof v?.pct === "number") return v.pct;
  if (v?.up === true) return 100;
  if (v?.up === false) return 0;
  return undefined;
}

function displayMetric(entry: SystemMetricEntry | undefined): {
  value: string;
  pct?: number;
  tone: HealthTone;
  stale: boolean;
  unavailable: boolean;
  hint?: string;
} {
  if (!entry) {
    return {
      value: "—",
      tone: "neutral",
      stale: false,
      unavailable: true,
      hint: "sem dados",
    };
  }
  const unavailable = entry.available === false || entry.value?.available === false;
  const stale = Boolean(entry.stale);
  if (unavailable) {
    return {
      value: "indisponível",
      tone: "neutral",
      stale: false,
      unavailable: true,
      hint: "collector falhou",
    };
  }
  if (stale) {
    return {
      value: "stale",
      pct: undefined,
      tone: "warn",
      stale: true,
      unavailable: false,
      hint: `idade ${Math.round((entry.age_ms ?? entry.ageMs ?? 0) / 1000)}s`,
    };
  }
  return {
    value: labelOf(entry.value),
    pct: pctOf(entry.value),
    tone: toneOf(entry.value),
    stale: false,
    unavailable: false,
  };
}

export function buildLiveMeta(
  metrics: Record<string, SystemMetricEntry>,
): DashboardLiveMeta {
  const realtimeKeys = [
    "cpu",
    "ram",
    "disk",
    "api_status",
    "frontend_status",
    "users_online",
    "requests_per_sec",
    "uptime",
  ];
  const ages = realtimeKeys
    .map((k) => metrics[k]?.age_ms ?? metrics[k]?.ageMs)
    .filter((n): n is number => typeof n === "number");
  const staleCount = Object.values(metrics).filter((m) => m.stale).length;
  const freshest = ages.length ? Math.min(...ages) : null;
  const live = freshest != null && freshest < 5000 && staleCount < realtimeKeys.length;
  const cpuTs = collectedOf(metrics.cpu);
  return {
    live,
    lastUpdateLabel: cpuTs
      ? new Date(cpuTs).toLocaleTimeString("pt-PT")
      : "—",
    staleCount,
  };
}

/** Mapeia system_metrics → DashboardFixture (honestidade: stale / indisponível). */
export function metricsToDashboard(
  metrics: Record<string, SystemMetricEntry>,
): DashboardFixture {
  const entry = (key: string) => metrics[key];
  const g = (key: string) => metrics[key]?.value ?? null;

  const scoreEntry = entry("platform_score");
  const scoreVal = g("platform_score");
  const scoreDisp = displayMetric(scoreEntry);
  const score =
    typeof scoreVal?.score === "number"
      ? scoreVal.score
      : typeof scoreVal?.score === "string"
        ? Number(scoreVal.score)
        : NaN;

  const alertsSummary = g("alerts_summary");
  const alertCount =
    typeof alertsSummary?.count === "number" ? alertsSummary.count : 0;

  const overview: PlatformOverview = {
    score: Number.isFinite(score) && !scoreDisp.stale && !scoreDisp.unavailable ? score : 0,
    healthLabel: scoreDisp.stale
      ? "Stale"
      : scoreDisp.unavailable || !Number.isFinite(score)
        ? "Aguardando auditoria 03:00"
        : toneOf(scoreVal) === "ok"
          ? "Good"
          : toneOf(scoreVal) === "warn"
            ? "Attention"
            : "Critical",
    healthTone: scoreDisp.stale
      ? "warn"
      : Number.isFinite(score)
        ? toneOf(scoreVal)
        : "neutral",
    lastAuditLabel: collectedOf(scoreEntry)
      ? `daily ${new Date(collectedOf(scoreEntry)).toLocaleString("pt-PT")}`
      : "sem snapshot daily",
    alertCount,
  };

  const statsQuick = g("stats_quick") as { products?: Record<string, unknown> } | null;
  const productsEntry: SystemMetricEntry | undefined = entry("stats_quick")
    ? {
        ...entry("stats_quick")!,
        value: (statsQuick?.products as Record<string, unknown>) || null,
        available: entry("stats_quick")!.available,
        stale: entry("stats_quick")!.stale,
      }
    : undefined;

  const mapQuick = (
    id: string,
    label: string,
    key: string,
    hint: string,
    valueOverride?: SystemMetricEntry,
  ): MetricCardData => {
    const d = displayMetric(valueOverride ?? entry(key));
    return {
      id,
      label,
      value: d.value,
      hint: d.hint || hint,
      tone: d.tone,
      stale: d.stale,
      unavailable: d.unavailable,
    };
  };

  const dbGrowth = entry("db_growth");
  const dbCatalogEntry: SystemMetricEntry | undefined = dbGrowth
    ? {
        ...dbGrowth,
        value:
          ((dbGrowth.value as { catalog?: Record<string, unknown> } | null)?.catalog as
            | Record<string, unknown>
            | null) || null,
      }
    : undefined;

  const quickMetrics: MetricCardData[] = [
    mapQuick("products", "Produtos", "stats_quick", "stats 5m", productsEntry),
    mapQuick("offers", "Ofertas", "feeds_quality", "feeds 1h"),
    mapQuick("users", "Logados", "users_online", "sessão 60s"),
    mapQuick("visitors", "Visitantes", "visitors_active", "API 60s"),
    mapQuick("rps", "Requests/s", "requests_per_sec", "tempo real"),
    mapQuick("db", "BD", "db_growth", "crescimento 5m", dbCatalogEntry),
  ];

  const infraKey = (
    id: string,
    label: string,
    key: string,
  ): HealthItem => {
    const d = displayMetric(entry(key));
    return {
      id,
      label,
      value: d.value,
      pct: d.stale || d.unavailable ? undefined : d.pct,
      tone: d.tone,
      stale: d.stale,
      unavailable: d.unavailable,
    };
  };

  const infrastructure: HealthItem[] = [
    infraKey("cpu", "CPU", "cpu"),
    infraKey("ram", "RAM", "ram"),
    infraKey("disk", "Disco", "disk"),
    infraKey("api", "API", "api_status"),
    infraKey("frontend", "Frontend", "frontend_status"),
    infraKey("uptime", "Uptime", "uptime"),
    infraKey("online", "Online", "users_online"),
  ];

  const alerts: AlertItem[] = [];
  if (alertCount > 0 && !entry("alerts_summary")?.stale) {
    alerts.push({
      id: "daily-alerts",
      title: `${alertCount} alerta(s) na última auditoria`,
      description: "Detalhe no relatório diário (03:00). O painel só lê cache.",
      tone: "warn",
      href: "/control-center/logs",
      timeLabel: overview.lastAuditLabel,
    });
  }
  const api = g("api_status");
  if (api && api.up === false && !entry("api_status")?.stale) {
    alerts.push({
      id: "api-down",
      title: "API DOWN",
      description: String(api.error || "Probe falhou"),
      tone: "critical",
      href: "/control-center/infraestrutura",
    });
  }
  const fe = g("frontend_status");
  if (fe && fe.up === false && !entry("frontend_status")?.stale) {
    alerts.push({
      id: "fe-down",
      title: "Frontend DOWN",
      description: String(fe.error || "Probe falhou"),
      tone: "critical",
      href: "/control-center/infraestrutura",
    });
  }

  return {
    overview,
    quickMetrics,
    infrastructure,
    charts: {
      products: [],
      offers: [],
      visits: [],
      accounts: [],
    },
    alerts,
  };
}
