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
import { storeLogoUrl } from "@/lib/coupon-stores";
import {
  normalizeCouponStoreSlug,
  resolveStoreLabel,
} from "@/lib/coupon-utils";
import type { Promotion } from "@/lib/types";

function StoreMark({ slug, name }: { slug: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[var(--hm-bg-elevated)] text-[10px] font-bold text-[var(--hm-faint)] ring-1 ring-[var(--hm-line)]">
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={storeLogoUrl(slug)}
      alt=""
      width={36}
      height={36}
      loading="lazy"
      className="h-9 w-9 rounded-md bg-[var(--hm-bg-elevated)] object-contain p-0.5 ring-1 ring-[var(--hm-line)]"
      onError={() => setFailed(true)}
    />
  );
}

type StoreGroup = {
  slug: string;
  name: string;
  coupons: Promotion[];
};

function promoKey(p: Promotion): string {
  return [
    normalizeCouponStoreSlug(p.storeSlug),
    (p.code || "").trim().toLowerCase(),
    (p.title || "").trim().toLowerCase(),
    p.externalId || "",
  ].join("|");
}

async function loadStorePromotions(store: string): Promise<Promotion[]> {
  const [promoRes, couponRes] = await Promise.all([
    getStorePromotions(store, 12).catch(() => null),
    getCoupons(store).catch(() => null),
  ]);
  const fromPromo = (promoRes?.results || []).map(mapPromotion);
  if (fromPromo.length) return fromPromo;
  return (couponRes?.coupons || []).map((c) => {
    const mapped = mapSmartCoupon(c);
    const slug = normalizeCouponStoreSlug(mapped.storeCode || store);
    return smartCouponToPromotion(
      { ...mapped, storeCode: slug },
      resolveStoreLabel(slug, mapped.storeName || undefined),
    );
  });
}

export function HomeCouponsPremium() {
  const [groups, setGroups] = useState<StoreGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [openStores, setOpenStores] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hub = await getCoupons();
        if (cancelled) return;

        const storeMeta =
          hub.stores?.length
            ? hub.stores.map((s) => ({
                slug: normalizeCouponStoreSlug(s.slug),
                name: s.name,
              }))
            : [];

        // Fallback: derive stores from coupon rows when `stores` is empty.
        if (!storeMeta.length) {
          const seen = new Set<string>();
          for (const c of hub.coupons || []) {
            const slug = normalizeCouponStoreSlug(
              c.storeSlug || c.storeCode || "",
            );
            if (!slug || seen.has(slug)) continue;
            seen.add(slug);
            storeMeta.push({
              slug,
              name: resolveStoreLabel(slug, c.store || undefined),
            });
          }
        }

        const loaded = await Promise.all(
          storeMeta.map(async (meta) => {
            const coupons = await loadStorePromotions(meta.slug);
            const seen = new Set<string>();
            const unique: Promotion[] = [];
            for (const p of coupons) {
              const key = promoKey(p);
              if (seen.has(key)) continue;
              seen.add(key);
              unique.push({
                ...p,
                storeSlug: normalizeCouponStoreSlug(p.storeSlug || meta.slug),
                storeName: p.storeName || meta.name,
              });
            }
            return {
              slug: meta.slug,
              name: meta.name || resolveStoreLabel(meta.slug),
              coupons: unique,
            } satisfies StoreGroup;
          }),
        );

        if (!cancelled) {
          setGroups(
            loaded
              .filter((g) => g.coupons.length > 0)
              .sort((a, b) => a.name.localeCompare(b.name, "pt")),
          );
        }
      } catch {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCount = useMemo(() => openStores.size, [openStores]);

  function toggleStore(slug: string) {
    setOpenStores((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <section
      id="cupoes"
      className="border-b border-[var(--hm-line)] bg-[var(--hm-bg-soft)]"
    >
      <div className="home-fade mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:max-w-7xl">
        <p className="home-section-kicker text-sm font-semibold">Complemento</p>
        <h2 className="mt-3 font-display text-2xl font-bold text-[var(--hm-ink)] sm:text-3xl">
          Cupões por loja
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--hm-muted)]">
          Campanhas activas por loja — à parte do preço observado. O cupão nunca
          entra no Índice Lymiar como se já estivesse aplicado.
        </p>

        {loading ? (
          <div className="mt-8 h-32 animate-pulse rounded-xl bg-[var(--hm-bg-elevated)]/80" />
        ) : groups.length === 0 ? (
          <p className="mt-8 text-sm text-[var(--hm-faint)]">
            Sem campanhas no momento.
          </p>
        ) : (
          <div className="home-coupon-list mt-8 overflow-hidden rounded-xl border border-[var(--hm-line)] bg-[var(--hm-bg-elevated)]">
            <ul className="divide-y divide-[var(--hm-line)]">
              {groups.map((group) => {
                const isOpen = openStores.has(group.slug);
                return (
                  <li key={group.slug}>
                    <button
                      type="button"
                      className="home-coupon-store-row flex w-full items-center gap-3 px-4 py-4 text-left sm:px-5"
                      onClick={() => toggleStore(group.slug)}
                      aria-expanded={isOpen}
                    >
                      <StoreMark slug={group.slug} name={group.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[var(--hm-ink)]">
                          {group.name}
                        </span>
                        <span className="text-xs text-[var(--hm-muted)]">
                          {group.coupons.length === 1
                            ? "1 campanha disponível"
                            : `${group.coupons.length} campanhas disponíveis`}
                        </span>
                      </span>
                      <span
                        className={`home-coupon-chevron shrink-0 text-[var(--hm-faint)] transition-transform ${
                          isOpen ? "home-coupon-chevron--open" : ""
                        }`}
                        aria-hidden
                      >
                        ▾
                      </span>
                    </button>
                    {isOpen ? (
                      <div className="border-t border-[var(--hm-line)] bg-[var(--hm-bg-soft)]/60 px-4 py-4 sm:px-5">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {group.coupons.map((p) => (
                            <CouponCard
                              key={promoKey(p)}
                              promotion={p}
                              compact
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {openCount === 0 ? (
              <p className="border-t border-[var(--hm-line)] px-5 py-3 text-xs text-[var(--hm-muted)]">
                Escolhe uma loja para ver as campanhas.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
