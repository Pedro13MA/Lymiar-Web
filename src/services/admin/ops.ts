/** Admin ops — system, logs, database, catalog */

import { getApiBaseUrl } from "@/lib/api-base-url";
import { getStoredToken } from "@/lib/auth/session";

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };
}

async function adminFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: authHeaders(),
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`admin_http_${res.status}:${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export type SystemInfo = {
  ok: boolean;
  ready: boolean;
  runtime: { python: string; platform: string; hostname: string };
  deploy: {
    hub?: Record<string, unknown>;
    webRelease?: string | null;
  };
  backups?: string[];
  paths: Record<string, string | null>;
  links: Record<string, string>;
};

export async function fetchAdminDatabaseSamples(
  table: string,
  limit = 8,
): Promise<{
  ok: boolean;
  table: string;
  columns: string[];
  rows: unknown[][];
}> {
  return adminFetch(
    `/api/admin/database/samples?table=${encodeURIComponent(table)}&limit=${limit}`,
  );
}

export type LogsInfo = {
  ok: boolean;
  ready: boolean;
  path: string | null;
  tail: number;
  lineCount: number;
  errorCount: number;
  lines: string[];
  errorLines: string[];
  readError?: string | null;
};

export type DatabaseInfo = {
  ok: boolean;
  ready: boolean;
  catalog?: {
    path: string;
    sizeBytes: number;
    sizeLabel: string;
    tableCount: number;
    products: { total: number; lmsku: number; ean: number };
    identity?: { candidatesByStatus?: Record<string, number> };
  };
  tables?: Array<{ table: string; count: number | null; error?: string }>;
  productColumns?: Array<{ name: string; type: string }>;
};

export type CatalogInfo = {
  ok: boolean;
  ready: boolean;
  totals?: { products: number; offers: number; stores: number };
  stores?: Array<{
    store: string;
    offers: number;
    products: number;
    minPrice: number | null;
    maxPrice: number | null;
  }>;
  topLeaves?: Array<{ leafId: string; count: number }>;
  topBrands?: Array<{ brand: string; count: number }>;
};

export type FeedRun = {
  id: number;
  cycleId?: string | null;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  status?: string;
  source?: string;
  productsProcessed?: number;
  inserted?: number;
  updated?: number;
  unchanged?: number;
  oosMarked?: number;
  skippedNoEan?: number;
  errors?: number;
  errorMessage?: string | null;
  store?: string;
  storeProductsProcessed?: number;
  storeInserted?: number;
  storeUpdated?: number;
  storeUnchanged?: number;
  storeOosMarked?: number;
  storeErrors?: number;
};

export type FeedMerchant = {
  slug: string;
  displayName: string;
  enabled: boolean;
  health: string;
  lastSyncAt: string | null;
  hoursSinceSync: number | null;
  nextExpectedSyncAt: string | null;
  lastSuccessAt?: string | null;
  lastErrorAt?: string | null;
  storeHealthStatus?: string | null;
  lastRun?: {
    productsProcessed?: number;
    inserted?: number;
    updated?: number;
    unchanged?: number;
    oosMarked?: number;
    errors?: number;
    completedAt?: string;
    durationMs?: number;
    status?: string;
    runId?: number;
  } | null;
  catalog: {
    offers: number;
    products: number;
    minPrice?: number | null;
    maxPrice?: number | null;
    qualityScore?: number | null;
    fields?: Record<string, number> | null;
  };
};

export type FeedsInfo = {
  ok: boolean;
  ready: boolean;
  module?: string;
  sampledAt?: string;
  intervalSeconds?: number;
  summary?: {
    healthy: number;
    total: number;
    lastGlobalSync: string | null;
    lastGlobalSyncDurationMs?: number | null;
    alerts: Array<{
      store: string;
      displayName: string;
      health: string;
      hoursSinceSync?: number;
      lastSyncAt?: string | null;
    }>;
  };
  globalLastRun?: {
    id?: number;
    completedAt?: string;
    durationMs?: number;
    status?: string;
    productsProcessed?: number;
    inserted?: number;
    updated?: number;
    unchanged?: number;
    oosMarked?: number;
    errors?: number;
  } | null;
  merchants?: FeedMerchant[];
};

export async function fetchAdminFeeds(): Promise<FeedsInfo> {
  return adminFetch("/api/admin/feeds");
}

export async function fetchAdminFeedRuns(
  store?: string,
  limit = 20,
): Promise<{ ok: boolean; runs: FeedRun[]; store?: string }> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (store) q.set("store", store);
  return adminFetch(`/api/admin/feeds/runs?${q.toString()}`);
}

export async function fetchAdminSystem(): Promise<SystemInfo> {
  return adminFetch("/api/admin/system");
}

export async function fetchAdminLogs(tail = 80): Promise<LogsInfo> {
  return adminFetch(`/api/admin/logs?tail=${tail}`);
}

export async function fetchAdminDatabase(): Promise<DatabaseInfo> {
  return adminFetch("/api/admin/database");
}

export async function fetchAdminCatalog(): Promise<CatalogInfo> {
  return adminFetch("/api/admin/catalog");
}
