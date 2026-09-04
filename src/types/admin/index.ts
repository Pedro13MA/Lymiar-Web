/** Admin Control Center — types only (no runtime logic). */

export type HealthTone = "ok" | "warn" | "critical" | "neutral";

export type AdminNavId =
  | "dashboard"
  | "produtos"
  | "identidade"
  | "conhecimento"
  | "utilizadores"
  | "analytics"
  | "feeds"
  | "base-de-dados"
  | "infraestrutura"
  | "logs"
  | "sistema";

export type AdminNavItem = {
  id: AdminNavId;
  label: string;
  href: string;
  icon: string;
};

export type MetricTrend = {
  direction: "up" | "down" | "flat";
  label: string;
};

export type MetricCardData = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  trend?: MetricTrend;
  tone?: HealthTone;
  stale?: boolean;
  unavailable?: boolean;
};

export type HealthItem = {
  id: string;
  label: string;
  value: string;
  pct?: number;
  tone: HealthTone;
  stale?: boolean;
  unavailable?: boolean;
};

export type AlertItem = {
  id: string;
  title: string;
  description: string;
  tone: Exclude<HealthTone, "neutral" | "ok"> | "ok";
  href?: string;
  timeLabel?: string;
};

export type ChartPoint = {
  label: string;
  value: number;
};

export type PlatformOverview = {
  score: number;
  healthLabel: string;
  healthTone: HealthTone;
  lastAuditLabel: string;
  alertCount: number;
};

export type DashboardLiveMeta = {
  live: boolean;
  lastUpdateLabel: string;
  staleCount: number;
};

export type DashboardFixture = {
  overview: PlatformOverview;
  quickMetrics: MetricCardData[];
  infrastructure: HealthItem[];
  charts: {
    products: ChartPoint[];
    offers: ChartPoint[];
    visits: ChartPoint[];
    accounts: ChartPoint[];
  };
  alerts: AlertItem[];
};

export type PlaceholderPageMeta = {
  title: string;
  description: string;
  section: string;
};
