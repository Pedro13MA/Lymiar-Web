import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { parseServerTiming, backendMsFromTiming } from "../server-timing";
import { cacheClear, cacheGet, cacheSet } from "../cache";
import { resolveEndpointConfig } from "../endpoints";

describe("parseServerTiming", () => {
  it("parses handler and total", () => {
    const t = parseServerTiming(
      "total;dur=648.0, handler;dur=471.0, sqlite;dur=130.0",
    );
    expect(t.total).toBe(648);
    expect(t.handler).toBe(471);
    expect(t.sqlite).toBe(130);
    expect(backendMsFromTiming(t)).toBe(471);
  });

  it("returns null backend when header missing", () => {
    expect(backendMsFromTiming(parseServerTiming(null))).toBeNull();
  });
});

describe("ttl cache", () => {
  beforeEach(() => cacheClear());

  it("stores and retrieves within TTL", () => {
    cacheSet("GET:/api/v1/categorias", { ok: true }, 60_000);
    expect(cacheGet("GET:/api/v1/categorias")).toEqual({ ok: true });
  });

  it("expires after TTL", () => {
    vi.useFakeTimers();
    cacheSet("k", "v", 1000);
    vi.advanceTimersByTime(1001);
    expect(cacheGet("k")).toBeNull();
    vi.useRealTimers();
  });
});

describe("endpoint config", () => {
  it("search usa cache curto e dedupe", () => {
    const cfg = resolveEndpointConfig("/api/v1/search?q=ssd");
    expect(cfg.cacheTtlMs).toBe(45_000);
    expect(cfg.dedupe).toBe(true);
  });

  it("taxonomy has cache TTL", () => {
    const cfg = resolveEndpointConfig("/api/v1/taxonomy/tree");
    expect(cfg.cacheTtlMs).toBeGreaterThan(0);
    expect(cfg.dedupe).toBe(true);
  });
});

describe("apiClient integration", () => {
  beforeEach(() => {
    cacheClear();
    vi.resetModules();
    vi.stubGlobal("performance", { now: () => Date.now() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("dedupes identical in-flight GET requests", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Server-Timing": "handler;dur=10.0",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { apiClient } = await import("../client");
    const [a, b] = await Promise.all([
      apiClient.get("/api/v1/categorias"),
      apiClient.get("/api/v1/categorias"),
    ]);

    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns cache hit on second request", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        return new Response(JSON.stringify({ n: calls }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    vi.stubEnv("NEXT_PUBLIC_API_METRICS", "1");

    const { apiClient, getRecentMetrics } = await import("../client");
    const first = await apiClient.get("/api/v1/categorias");
    const second = await apiClient.get("/api/v1/categorias");

    expect(first).toEqual({ n: 1 });
    expect(second).toEqual({ n: 1 });
    expect(calls).toBe(1);

    const hit = getRecentMetrics().find((m) => m.cache === "HIT");
    expect(hit).toBeTruthy();
  });

  it("aborts request when signal fires", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
      ),
    );

    const { apiClient, isAbortError } = await import("../client");
    const ctrl = new AbortController();
    const p = apiClient.get("/api/v1/search?q=ssd", { signal: ctrl.signal });
    ctrl.abort();
    await expect(p).rejects.toSatisfy((e: unknown) => isAbortError(e));
  });
});
