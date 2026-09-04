import { resolveConsumerDecision } from "@/lib/consumer-decision";
import type { Product } from "@/lib/types";

export type VerdictKey = "BUY" | "WAIT" | "UNKNOWN";

export const RADAR_PRODUCT_LIMIT = 12;

function productKey(p: Product): string {
  return (p.ean || p.slug || "").trim();
}

function productStore(p: Product): string {
  const raw =
    p.decision?.cheapestStore ||
    p.offers?.[0]?.store ||
    p.offers?.[0]?.storeName ||
    "";
  return raw.trim().toLowerCase() || `_id_${productKey(p)}`;
}

export function dedupeProducts(products: Product[], limit?: number): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const p of products) {
    const key = productKey(p);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (limit != null && out.length >= limit) break;
  }
  return out;
}

/**
 * Produtos únicos para o radar: sem EAN/slug repetido, lojas misturadas
 * (round-robin) para evitar uma sequência toda da mesma loja.
 */
export function pickRadarProducts(
  products: Product[],
  limit: number = RADAR_PRODUCT_LIMIT,
): Product[] {
  const unique = dedupeProducts(
    products.filter((p) => Boolean(p.imageUrl) || Boolean(p.name)),
  );
  if (unique.length <= 1) return unique.slice(0, limit);

  const byStore = new Map<string, Product[]>();
  for (const p of unique) {
    const store = productStore(p);
    const list = byStore.get(store);
    if (list) list.push(p);
    else byStore.set(store, [p]);
  }

  const queues = [...byStore.values()].map((list) => [...list]);
  const out: Product[] = [];
  let guard = 0;

  while (out.length < limit && guard < unique.length * 4) {
    guard += 1;
    let progressed = false;
    for (const queue of queues) {
      if (out.length >= limit) break;
      if (!queue.length) continue;

      let pickIndex = 0;
      const prev = out[out.length - 1];
      if (prev) {
        const prevStore = productStore(prev);
        const alt = queue.findIndex((p) => productStore(p) !== prevStore);
        if (alt >= 0) pickIndex = alt;
      }

      const [picked] = queue.splice(pickIndex, 1);
      if (!picked) continue;
      if (prev && productKey(prev) === productKey(picked)) continue;
      out.push(picked);
      progressed = true;
    }
    if (!progressed) break;
  }

  return out;
}

/** Veredicto canónico ou fallback ao semáforo editorial quando a API não envia consumerDecision. */
export function productVerdictKey(p: Product): VerdictKey {
  const cd = resolveConsumerDecision(p);
  if (cd?.verdict) return cd.verdict;
  const sem = p.decision?.semaphore;
  if (sem === "buy") return "BUY";
  if (sem === "wait") return "WAIT";
  return "UNKNOWN";
}

export function groupProductsByVerdict(
  pools: Product[][],
): Record<VerdictKey, Product[]> {
  const out: Record<VerdictKey, Product[]> = {
    BUY: [],
    WAIT: [],
    UNKNOWN: [],
  };
  const seen = new Set<string>();
  for (const pool of pools) {
    for (const p of pool) {
      const key = productKey(p);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out[productVerdictKey(p)].push(p);
    }
  }
  return out;
}

export function pickAtIndex<T>(items: T[], index: number): T | null {
  if (items.length === 0) return null;
  return items[index % items.length];
}
