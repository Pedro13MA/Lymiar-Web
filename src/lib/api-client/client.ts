/**
 * apiClient v2 — camada única de comunicação HTTP com a API Lymiar.
 *
 * - deduplicação de GET idênticos em voo (shared Promise)
 * - AbortController + timeout configurável
 * - cache TTL para recursos estáveis
 * - leitura automática de Server-Timing
 * - erros uniformes (ApiError)
 */

import { getApiBaseUrl } from "@/lib/api-base-url";
import { cacheGet, cacheSet } from "./cache";
import { requestKey, resolveEndpointConfig } from "./endpoints";
import {
  isApiMetricsEnabled,
  markRenderForLabel,
  nextMetricId,
  recordMetric,
  subscribeMetrics,
  updateMetricRender,
  updateDedupMetric,
  getRecentMetrics,
} from "./metrics";
import { backendMsFromTiming, parseServerTiming } from "./server-timing";
import {
  ApiError,
  type ApiMetricEntry,
  type ApiRequestOptions,
} from "./types";

export { ApiError, isAbortError } from "./types";
export type { ApiMetricEntry, ApiRequestOptions } from "./types";
export {
  getRecentMetrics,
  isApiMetricsEnabled,
  subscribeMetrics,
} from "./metrics";

const inflight = new Map<string, Promise<unknown>>();

/** Browser: always fresh. Build/SSR: force-cache so static export stays static. */
function fetchCacheMode(): RequestCache {
  return typeof window === "undefined" ? "force-cache" : "no-store";
}

function mergeAbortSignals(
  ...signals: (AbortSignal | undefined)[]
): AbortSignal | undefined {
  const active = signals.filter((s): s is AbortSignal => !!s);
  if (active.length === 0) return undefined;
  if (active.length === 1) return active[0];
  if (active.some((s) => s.aborted)) {
    const ctrl = new AbortController();
    ctrl.abort(active.find((s) => s.aborted)?.reason);
    return ctrl.signal;
  }
  const ctrl = new AbortController();
  for (const s of active) {
    s.addEventListener("abort", () => ctrl.abort(s.reason), { once: true });
  }
  return ctrl.signal;
}

function timeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const ctrl = new AbortController();
  const id = setTimeout(() => {
    ctrl.abort(new DOMException("timeout", "AbortError"));
  }, ms);
  return {
    signal: ctrl.signal,
    clear: () => clearTimeout(id),
  };
}

function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function metricLabel(path: string, label?: string): string {
  if (label) return label;
  if (path.includes("/search/suggest")) return "SUGGEST";
  if (path.includes("/search")) return "SEARCH";
  if (path.includes("/taxonomy/tree")) return "TAXONOMY";
  if (path.includes("/categorias")) return "CATEGORIES";
  if (path.includes("/marcas")) return "BRANDS";
  if (path.includes("/lojas")) return "STORES";
  if (path.includes("/home")) return "HOME";
  if (path.includes("/product/")) return "PRODUCT";
  return path.split("?")[0]?.split("/").pop()?.toUpperCase() || "API";
}

function recordCachedHit(
  id: string,
  method: string,
  path: string,
  label: string,
): void {
  if (!isApiMetricsEnabled()) return;
  recordMetric({
    id,
    label,
    method,
    path,
    status: 200,
    cache: "HIT",
    deduped: false,
    networkMs: 0,
    backendMs: null,
    transferMs: 0,
    renderMs: null,
    totalMs: 0,
    aborted: false,
    timestamp: Date.now(),
  });
}

function recordDedupWaiter(
  id: string,
  method: string,
  path: string,
  label: string,
): void {
  if (!isApiMetricsEnabled()) return;
  recordMetric({
    id,
    label,
    method,
    path,
    status: 200,
    cache: "MISS",
    deduped: true,
    networkMs: 0,
    backendMs: null,
    transferMs: 0,
    renderMs: null,
    totalMs: 0,
    aborted: false,
    timestamp: Date.now(),
  });
}

async function executeFetch<T>(
  method: string,
  path: string,
  opts: ApiRequestOptions | undefined,
  metricId: string,
): Promise<T> {
  const url = buildUrl(path);
  const endpoint = resolveEndpointConfig(path);
  const timeoutMs = opts?.timeoutMs ?? endpoint.timeoutMs;
  const label = metricLabel(path, opts?.label);

  const timeout = timeoutSignal(timeoutMs);
  const signal = mergeAbortSignals(opts?.signal, timeout.signal);

  const headers: HeadersInit = {
    Accept: "application/json",
    ...(opts?.body != null ? { "Content-Type": "application/json" } : {}),
    ...(opts?.headers || {}),
  };

  const t0 = performance.now();
  let networkMs = 0;
  let transferMs = 0;
  let backendMs: number | null = null;
  let status = 0;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: opts?.body != null ? JSON.stringify(opts.body) : undefined,
      signal,
      credentials: opts?.credentials,
      cache: fetchCacheMode(),
    });

    networkMs = performance.now() - t0;
    status = res.status;

    const serverTiming = parseServerTiming(
      res.headers?.get?.("Server-Timing") ?? null,
    );
    backendMs = backendMsFromTiming(serverTiming);

    if (!res.ok) {
      if (opts?.allowStatuses?.includes(status)) {
        if (isApiMetricsEnabled()) {
          recordMetric({
            id: metricId,
            label,
            method,
            path,
            status,
            cache: "MISS",
            deduped: false,
            networkMs,
            backendMs,
            transferMs: 0,
            renderMs: null,
            totalMs: networkMs,
            aborted: false,
            timestamp: Date.now(),
          });
        }
        return null as T;
      }
      throw new ApiError(`API ${status} ${path}`, {
        status,
        path,
        kind: "http",
      });
    }

    const parseT0 = performance.now();
    let data: T;
    if (res.status === 204) {
      data = undefined as T;
    } else {
      try {
        data = (await res.json()) as T;
      } catch {
        throw new ApiError(`API parse ${path}`, {
          status,
          path,
          kind: "parse",
        });
      }
    }
    transferMs = performance.now() - parseT0;

    if (isApiMetricsEnabled()) {
      const entry: ApiMetricEntry = {
        id: metricId,
        label,
        method,
        path,
        status,
        cache: "MISS",
        deduped: false,
        networkMs,
        backendMs,
        transferMs,
        renderMs: null,
        totalMs: networkMs + transferMs,
        aborted: false,
        timestamp: Date.now(),
      };
      recordMetric(entry);
    }

    return data;
  } catch (err) {
    const aborted =
      (err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof ApiError && err.kind === "abort");

    if (aborted) {
      const isTimeout =
        err instanceof DOMException &&
        err.message === "timeout";
      if (isApiMetricsEnabled()) {
        recordMetric({
          id: metricId,
          label,
          method,
          path,
          status: "error",
          cache: "MISS",
          deduped: false,
          networkMs: performance.now() - t0,
          backendMs,
          transferMs: 0,
          renderMs: null,
          totalMs: performance.now() - t0,
          aborted: true,
          timestamp: Date.now(),
          error: isTimeout ? "timeout" : "abort",
        });
      }
      throw new ApiError(isTimeout ? `API timeout ${path}` : `API abort ${path}`, {
        status: 0,
        path,
        kind: isTimeout ? "timeout" : "abort",
      });
    }

    if (err instanceof ApiError) {
      if (isApiMetricsEnabled()) {
        recordMetric({
          id: metricId,
          label,
          method,
          path,
          status: err.status || "error",
          cache: "MISS",
          deduped: false,
          networkMs: performance.now() - t0,
          backendMs,
          transferMs: 0,
          renderMs: null,
          totalMs: performance.now() - t0,
          aborted: false,
          timestamp: Date.now(),
          error: err.message,
        });
      }
      throw err;
    }

    if (isApiMetricsEnabled()) {
      recordMetric({
        id: metricId,
        label,
        method,
        path,
        status: "error",
        cache: "MISS",
        deduped: false,
        networkMs: performance.now() - t0,
        backendMs,
        transferMs: 0,
        renderMs: null,
        totalMs: performance.now() - t0,
        aborted: false,
        timestamp: Date.now(),
        error: err instanceof Error ? err.message : "network",
      });
    }

    throw new ApiError(
      err instanceof Error ? err.message : `API network ${path}`,
      { status: 0, path, kind: "network" },
    );
  } finally {
    timeout.clear();
  }
}

async function request<T>(
  method: string,
  path: string,
  opts?: ApiRequestOptions,
): Promise<T> {
  const endpoint = resolveEndpointConfig(path);
  const key = requestKey(method, path);
  const metricId = nextMetricId();

  const isGet = method === "GET";
  const canCache =
    isGet &&
    endpoint.cacheTtlMs > 0 &&
    !opts?.bypassCache &&
    typeof window !== "undefined";

  if (canCache) {
    const hit = cacheGet<T>(key);
    if (hit != null) {
      recordCachedHit(metricId, method, path, metricLabel(path, opts?.label));
      return hit;
    }
  }

  const canDedupe =
    isGet && endpoint.dedupe && !opts?.signal && !opts?.bypassCache;

  if (canDedupe) {
    const existing = inflight.get(key);
    if (existing) {
      const dedupId = nextMetricId();
      const label = metricLabel(path, opts?.label);
      recordDedupWaiter(dedupId, method, path, label);
      const joinT0 = performance.now();
      return existing
        .then((data) => {
          updateDedupMetric(dedupId, performance.now() - joinT0, 200);
          return data as T;
        })
        .catch((err) => {
          updateDedupMetric(
            dedupId,
            performance.now() - joinT0,
            err instanceof ApiError ? err.status || 0 : 0,
          );
          throw err;
        }) as Promise<T>;
    }
  }

  const promise = executeFetch<T>(method, path, opts, metricId);

  if (canDedupe) {
    inflight.set(key, promise);
    promise.finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });
  }

  try {
    const data = await promise;
    if (canCache) {
      cacheSet(key, data, endpoint.cacheTtlMs);
    }
    return data;
  } catch (err) {
    throw err;
  }
}

export const apiClient = {
  get<T>(path: string, opts?: Omit<ApiRequestOptions, "method" | "body">) {
    return request<T>("GET", path, opts);
  },

  post<T>(
    path: string,
    body?: unknown,
    opts?: Omit<ApiRequestOptions, "method" | "body">,
  ) {
    return request<T>("POST", path, { ...opts, body });
  },

  put<T>(
    path: string,
    body?: unknown,
    opts?: Omit<ApiRequestOptions, "method" | "body">,
  ) {
    return request<T>("PUT", path, { ...opts, body });
  },

  patch<T>(
    path: string,
    body?: unknown,
    opts?: Omit<ApiRequestOptions, "method" | "body">,
  ) {
    return request<T>("PATCH", path, { ...opts, body });
  },

  delete(
    path: string,
    opts?: Omit<ApiRequestOptions, "method"> & { body?: unknown },
  ) {
    return request<void>("DELETE", path, opts);
  },

  /** Marca tempo de render React para um pedido concreto. */
  markRender(metricId: string, renderMs: number) {
    updateMetricRender(metricId, renderMs);
  },

  /** Marca render no pedido mais recente com a etiqueta (ex. SEARCH). */
  markRenderForLabel(label: string, renderMs: number) {
    markRenderForLabel(label, renderMs);
  },

  getRecentMetrics,
  subscribeMetrics,
  isMetricsEnabled: isApiMetricsEnabled,
};

/** Compat — equivalente ao antigo apiGet interno. */
export function apiGet<T>(
  path: string,
  init?: RequestInit & {
    label?: string;
    bypassCache?: boolean;
    timeoutMs?: number;
    allowStatuses?: number[];
  },
): Promise<T> {
  return apiClient.get<T>(path, {
    signal: init?.signal ?? undefined,
    headers: init?.headers,
    credentials: init?.credentials,
    label: init?.label,
    bypassCache: init?.bypassCache,
    timeoutMs: init?.timeoutMs,
    allowStatuses: init?.allowStatuses,
  });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  init?: RequestInit & { label?: string },
): Promise<T> {
  return apiClient.post<T>(path, body, {
    signal: init?.signal ?? undefined,
    headers: init?.headers,
    credentials: init?.credentials,
    label: init?.label,
  });
}

export function apiDelete(
  path: string,
  init?: RequestInit & { label?: string },
): Promise<void> {
  return apiClient.delete(path, {
    signal: init?.signal ?? undefined,
    headers: init?.headers,
    credentials: init?.credentials,
    label: init?.label,
  });
}

/** Resposta raw para casos especiais (304, headers). */
export async function apiFetchRaw(
  path: string,
  init?: RequestInit & { timeoutMs?: number; label?: string },
): Promise<Response> {
  const url = buildUrl(path);
  const endpoint = resolveEndpointConfig(path);
  const timeoutMs = init?.timeoutMs ?? endpoint.timeoutMs;
  const timeout = timeoutSignal(timeoutMs);
  const signal = mergeAbortSignals(init?.signal ?? undefined, timeout.signal);
  const metricId = nextMetricId();
  const method = init?.method || "GET";
  const label = metricLabel(path, init?.label as string | undefined);
  const t0 = performance.now();

  try {
    const res = await fetch(url, {
      ...init,
      signal,
      cache: fetchCacheMode(),
    });

    const networkMs = performance.now() - t0;
    const serverTiming = parseServerTiming(
      res.headers?.get?.("Server-Timing") ?? null,
    );
    const backendMs = backendMsFromTiming(serverTiming);

    if (isApiMetricsEnabled()) {
      recordMetric({
        id: metricId,
        label,
        method,
        path,
        status: res.status,
        cache: "MISS",
        deduped: false,
        networkMs,
        backendMs,
        transferMs: 0,
        renderMs: null,
        totalMs: networkMs,
        aborted: false,
        timestamp: Date.now(),
      });
    }

    return res;
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "AbortError" || err.message === "timeout")
    ) {
      throw new ApiError(`API abort ${path}`, {
        status: 0,
        path,
        kind: err.message === "timeout" ? "timeout" : "abort",
      });
    }
    throw err;
  } finally {
    timeout.clear();
  }
}
