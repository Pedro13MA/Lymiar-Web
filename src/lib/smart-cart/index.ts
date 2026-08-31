/**
 * FASE 7.12 — serviço Smart Cart (adapter injectável).
 */

import { LocalSmartCartAdapter } from "@/lib/smart-cart/local-storage-adapter";
import { parseShippingCostEur } from "@/lib/smart-cart/optimize";
import type { SmartCartStorageAdapter } from "@/lib/smart-cart/storage-adapter";
import type {
  CartConfig,
  CartConfigKind,
  CartItem,
  CartItemStatus,
  CartOfferSnap,
  CartPriceAlert,
  SmartCartSnapshot,
} from "@/lib/smart-cart/types";
import type { Offer, Product } from "@/lib/types";
import {
  consumerVerdictBadge,
  resolveConsumerDecision,
} from "@/lib/consumer-decision";
import { resolveProductInsights } from "@/lib/product-insights-buying";
import { bestSavingsTip, recommendationsFromApi } from "@/lib/product-discovery";

let adapter: SmartCartStorageAdapter = new LocalSmartCartAdapter();

export function setSmartCartAdapter(next: SmartCartStorageAdapter): void {
  adapter = next;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emit(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lymiar:smartcart-changed"));
  }
}

export function subscribeSmartCart(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("lymiar:smartcart-changed", cb);
  return () => window.removeEventListener("lymiar:smartcart-changed", cb);
}

export function offersToSnaps(offers: Offer[]): CartOfferSnap[] {
  return offers
    .filter((o) => o.price > 0)
    .map((o) => ({
      store: o.slug || o.store,
      storeName: o.storeName || o.store,
      price: o.price,
      url: o.url,
      inStock: o.inStock,
      shippingCostEur: parseShippingCostEur(
        o.shippingDetails?.shippingCost || o.shippingInfo || null,
      ),
    }));
}

export function productToCartDraft(
  product: Product,
  qty = 1,
): Omit<CartItem, "id" | "addedAt" | "updatedAt" | "status"> {
  const insights = resolveProductInsights(product);
  const consumer = resolveConsumerDecision(product);
  const tip = bestSavingsTip(
    product,
    recommendationsFromApi(product.recommendations),
  );
  return {
    slug: product.slug,
    ean: product.ean,
    name: product.name,
    brand: product.brand,
    imageUrl: product.imageUrl,
    quantity: qty,
    preferredStore: null,
    priceAtAdd: product.currentPrice,
    offers: offersToSnaps(product.offers),
    leafId: product.leafId,
    chipsetModel: product.chipsetModel,
    lymiarIndex: product.decision.lymiarIndex.value,
    condition: product.condition,
    insightRecommendation: consumer
      ? consumer.verdict
      : insights.recommendation,
    insightLabel: consumer
      ? consumerVerdictBadge(consumer.verdict)
      : insights.recommendationLabel,
    savingsTipEur: tip?.eur ?? null,
  };
}

async function mutate(
  fn: (snap: SmartCartSnapshot) => SmartCartSnapshot,
): Promise<SmartCartSnapshot> {
  const snap = await adapter.load();
  const next = fn(snap);
  await adapter.save(next);
  emit();
  return next;
}

export async function loadSmartCart(): Promise<SmartCartSnapshot> {
  return adapter.load();
}

export async function getActiveConfig(): Promise<CartConfig> {
  const snap = await adapter.load();
  return (
    snap.configs.find((c) => c.id === snap.activeConfigId) || snap.configs[0]
  );
}

export async function listConfigs(): Promise<CartConfig[]> {
  const snap = await adapter.load();
  return snap.configs;
}

export async function setActiveConfig(configId: string): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    activeConfigId: configId,
  }));
}

export async function createConfig(
  name: string,
  kind: CartConfigKind = "generic",
): Promise<CartConfig> {
  const now = Date.now();
  const cfg: CartConfig = {
    id: uid("cfg"),
    name: name.trim() || "Carrinho",
    kind,
    items: [],
    createdAt: now,
    updatedAt: now,
  };
  await mutate((snap) => ({
    ...snap,
    activeConfigId: cfg.id,
    configs: [...snap.configs, cfg],
  }));
  return cfg;
}

export async function renameConfig(configId: string, name: string): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    configs: snap.configs.map((c) =>
      c.id === configId
        ? { ...c, name: name.trim() || c.name, updatedAt: Date.now() }
        : c,
    ),
  }));
}

export async function deleteConfig(configId: string): Promise<void> {
  await mutate((snap) => {
    if (snap.configs.length <= 1) return snap;
    const configs = snap.configs.filter((c) => c.id !== configId);
    return {
      ...snap,
      configs,
      activeConfigId:
        snap.activeConfigId === configId ? configs[0].id : snap.activeConfigId,
      alerts: snap.alerts.filter((a) => a.configId !== configId),
    };
  });
}

export async function addToCart(
  draft: Omit<CartItem, "id" | "addedAt" | "updatedAt" | "status">,
): Promise<CartItem> {
  const now = Date.now();
  let created!: CartItem;
  await mutate((snap) => {
    const configs = snap.configs.map((c) => {
      if (c.id !== snap.activeConfigId) return c;
      const existing = c.items.find((i) => i.slug === draft.slug);
      if (existing) {
        created = {
          ...existing,
          quantity: existing.quantity + (draft.quantity || 1),
          offers: draft.offers.length ? draft.offers : existing.offers,
          updatedAt: now,
        };
        return {
          ...c,
          items: c.items.map((i) => (i.id === existing.id ? created : i)),
          updatedAt: now,
        };
      }
      created = {
        ...draft,
        id: uid("item"),
        quantity: draft.quantity || 1,
        addedAt: now,
        updatedAt: now,
        status: "todo",
      };
      return { ...c, items: [...c.items, created], updatedAt: now };
    });
    return { ...snap, configs };
  });
  return created;
}

export async function removeFromCart(itemId: string): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    configs: snap.configs.map((c) =>
      c.id === snap.activeConfigId
        ? {
            ...c,
            items: c.items.filter((i) => i.id !== itemId),
            updatedAt: Date.now(),
          }
        : c,
    ),
  }));
}

export async function setQuantity(itemId: string, quantity: number): Promise<void> {
  const qty = Math.max(1, Math.min(99, Math.floor(quantity)));
  await mutate((snap) => ({
    ...snap,
    configs: snap.configs.map((c) =>
      c.id === snap.activeConfigId
        ? {
            ...c,
            items: c.items.map((i) =>
              i.id === itemId ? { ...i, quantity: qty, updatedAt: Date.now() } : i,
            ),
            updatedAt: Date.now(),
          }
        : c,
    ),
  }));
}

export async function setPreferredStore(
  itemId: string,
  store: string | null,
): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    configs: snap.configs.map((c) =>
      c.id === snap.activeConfigId
        ? {
            ...c,
            items: c.items.map((i) =>
              i.id === itemId
                ? { ...i, preferredStore: store, updatedAt: Date.now() }
                : i,
            ),
            updatedAt: Date.now(),
          }
        : c,
    ),
  }));
}

export async function setItemStatus(
  itemId: string,
  status: CartItemStatus,
): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    configs: snap.configs.map((c) =>
      c.id === snap.activeConfigId
        ? {
            ...c,
            items: c.items.map((i) =>
              i.id === itemId ? { ...i, status, updatedAt: Date.now() } : i,
            ),
            updatedAt: Date.now(),
          }
        : c,
    ),
  }));
}

/** Actualiza ofertas/preços a partir do produto vivo (sem inventar). */
export async function refreshItemFromProduct(
  itemId: string,
  product: Product,
): Promise<void> {
  const snaps = offersToSnaps(product.offers);
  await mutate((snap) => ({
    ...snap,
    configs: snap.configs.map((c) =>
      c.id === snap.activeConfigId
        ? {
            ...c,
            items: c.items.map((i) =>
              i.id === itemId
                ? {
                    ...i,
                    name: product.name,
                    imageUrl: product.imageUrl || i.imageUrl,
                    offers: snaps.length ? snaps : i.offers,
                    lymiarIndex: product.decision.lymiarIndex.value,
                    updatedAt: Date.now(),
                  }
                : i,
            ),
            updatedAt: Date.now(),
          }
        : c,
    ),
  }));
}

export async function replaceCartItem(
  itemId: string,
  product: Product,
): Promise<void> {
  const draft = productToCartDraft(product, 1);
  await mutate((snap) => ({
    ...snap,
    configs: snap.configs.map((c) =>
      c.id === snap.activeConfigId
        ? {
            ...c,
            items: c.items.map((i) =>
              i.id === itemId
                ? {
                    ...i,
                    slug: draft.slug,
                    ean: draft.ean,
                    name: draft.name,
                    brand: draft.brand,
                    imageUrl: draft.imageUrl,
                    offers: draft.offers,
                    priceAtAdd: draft.priceAtAdd,
                    leafId: draft.leafId,
                    chipsetModel: draft.chipsetModel,
                    lymiarIndex: draft.lymiarIndex,
                    preferredStore: null,
                    updatedAt: Date.now(),
                  }
                : i,
            ),
            updatedAt: Date.now(),
          }
        : c,
    ),
  }));
}

export async function upsertCartAlert(
  dropByEur: number,
  baselineTotal: number,
): Promise<CartPriceAlert> {
  const snap = await adapter.load();
  const existing = snap.alerts.find(
    (a) => a.configId === snap.activeConfigId && a.active,
  );
  const alert: CartPriceAlert = existing
    ? {
        ...existing,
        dropByEur,
        baselineTotal,
        active: true,
      }
    : {
        id: uid("calert"),
        configId: snap.activeConfigId,
        dropByEur,
        baselineTotal,
        active: true,
        createdAt: Date.now(),
      };
  await mutate((s) => ({
    ...s,
    alerts: [
      ...s.alerts.filter((a) => a.configId !== s.activeConfigId),
      alert,
    ],
  }));
  return alert;
}

export async function getCartAlert(): Promise<CartPriceAlert | null> {
  const snap = await adapter.load();
  return (
    snap.alerts.find((a) => a.configId === snap.activeConfigId && a.active) ||
    null
  );
}

export async function clearCart(): Promise<void> {
  await mutate((snap) => ({
    ...snap,
    configs: snap.configs.map((c) =>
      c.id === snap.activeConfigId
        ? { ...c, items: [], updatedAt: Date.now() }
        : c,
    ),
  }));
}

export async function cartItemCount(): Promise<number> {
  const cfg = await getActiveConfig();
  return cfg.items.reduce((s, i) => s + i.quantity, 0);
}
