"use client";

import { useEffect, useMemo, useState } from "react";
import { CouponCard } from "@/components/cupoes/CouponCard";
import {
  getCoupons,
  getStorePromotions,
  mapPromotion,
  mapSmartCoupon,
  smartCouponToPromotion,
} from "@/lib/api";
import { normalizeCouponStoreSlug } from "@/lib/coupon-utils";
import type { Product, Promotion } from "@/lib/types";

type Props = { product: Product };

const MAX_CARDS = 6;

function uniqueCouponStores(product: Product): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of product.offers || []) {
    const raw = (o.slug || o.store || "").trim();
    if (!raw) continue;
    const slug = normalizeCouponStoreSlug(raw);
    if (!slug || slug === "other" || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

function promoKey(p: Promotion): string {
  return [
    normalizeCouponStoreSlug(p.storeSlug),
    (p.code || "").trim().toLowerCase(),
    (p.title || "").trim().toLowerCase(),
    p.externalId || "",
  ].join("|");
}

async function fetchStorePromotions(store: string): Promise<Promotion[]> {
  const [promoRes, couponRes] = await Promise.all([
    getStorePromotions(store, 8).catch(() => null),
    getCoupons(store).catch(() => null),
  ]);

  const fromPromotions = (promoRes?.results || []).map(mapPromotion);
  if (fromPromotions.length) return fromPromotions;

  return (couponRes?.coupons || []).map((c) =>
    smartCouponToPromotion(mapSmartCoupon(c)),
  );
}

function sortPromotions(a: Promotion, b: Promotion): number {
  const da = a.discountValue ?? -1;
  const db = b.discountValue ?? -1;
  if (db !== da) return db - da;
  const ea = a.endDate ? Date.parse(a.endDate) : Number.POSITIVE_INFINITY;
  const eb = b.endDate ? Date.parse(b.endDate) : Number.POSITIVE_INFINITY;
  return ea - eb;
}

/**
 * Cupões / campanhas das lojas onde o produto está à venda.
 * Só aparece quando há pelo menos um cupão/campanha conhecido.
 */
export function ProductCouponsSection({ product }: Props) {
  const stores = useMemo(() => uniqueCouponStores(product), [product]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loaded, setLoaded] = useState(stores.length === 0);

  useEffect(() => {
    if (!stores.length) {
      setPromotions([]);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setLoaded(false);

    Promise.all(stores.map((store) => fetchStorePromotions(store)))
      .then((chunks) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const merged: Promotion[] = [];
        for (const list of chunks) {
          for (const p of list) {
            const key = promoKey(p);
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(p);
          }
        }
        merged.sort(sortPromotions);
        setPromotions(merged.slice(0, MAX_CARDS));
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setPromotions([]);
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [stores]);

  if (!loaded || promotions.length === 0) return null;

  return (
    <section
      id="cupoes"
      className="pdp-section scroll-mt-20 space-y-3"
      aria-labelledby="p34-coupons-heading"
    >
      <p className="pdp-kicker">Complemento</p>
      <h2
        id="p34-coupons-heading"
        className="mt-2 font-display text-xl font-bold text-slate-900 sm:text-2xl"
      >
        Cupões e campanhas
      </h2>
      <p className="text-sm text-slate-500">
        À parte do preço observado — o cupão nunca entra no histórico como se
        já estivesse aplicado.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {promotions.map((promo) => (
          <CouponCard
            key={promoKey(promo)}
            promotion={promo}
            compact
          />
        ))}
      </div>
    </section>
  );
}

export function ProductStoresEmpty() {
  return (
    <div
      className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center"
      role="status"
    >
      <p className="text-sm text-slate-600">
        Ainda não há lojas com oferta activa para este produto.
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Guarda nos favoritos ou cria um alerta para saberes quando houver stock.
      </p>
    </div>
  );
}

export function ProductHistoryHint({ thin }: { thin: boolean }) {
  if (!thin) return null;
  return (
    <p className="text-sm text-slate-500" role="status">
      Histórico ainda curto — o gráfico mostra o que já observámos. Não inventamos
      certeza com poucos dados.
    </p>
  );
}
