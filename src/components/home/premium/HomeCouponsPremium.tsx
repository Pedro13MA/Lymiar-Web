"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getCoupons,
  mapSmartCoupon,
  smartCouponToPromotion,
} from "@/lib/api";
import { storeLogoUrl } from "@/lib/coupon-stores";
import {
  formatCouponDiscount,
  formatCouponValidity,
  normalizeCouponStoreSlug,
  resolveStoreLabel,
} from "@/lib/coupon-utils";
import type { Promotion } from "@/lib/types";

function StoreMark({ slug, name }: { slug: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
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
      className="h-9 w-9 rounded-md bg-white object-contain p-0.5 ring-1 ring-slate-200"
      onError={() => setFailed(true)}
    />
  );
}

function campaignHref(p: Promotion): { href: string; external: boolean } {
  const url = (p.url || "").trim();
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return { href: url, external: true };
  }
  const storeSlug = normalizeCouponStoreSlug(p.storeSlug);
  const code = (p.code || "").trim();
  if (code) {
    return {
      href: `/cupoes/${encodeURIComponent(storeSlug)}/${encodeURIComponent(code)}/`,
      external: false,
    };
  }
  return {
    href: `/cupoes/${encodeURIComponent(storeSlug)}/`,
    external: false,
  };
}

type StoreGroup = {
  slug: string;
  name: string;
  coupons: Promotion[];
};

function CouponDetailRow({ promo }: { promo: Promotion }) {
  const code = (promo.code || "").trim() || "CAMPANHA";
  const validity = formatCouponValidity(promo);
  const discount = formatCouponDiscount(promo);
  const { href, external } = campaignHref(promo);

  const rowClass =
    "flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-slate-50 sm:px-5";

  const body = (
    <>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-slate-700">
            {code}
          </span>
          {discount && (
            <span className="rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-[var(--hm-brand)]">
              {discount}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">{validity}</p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-[var(--hm-brand)]">
        Ver →
      </span>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={rowClass}
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className={rowClass}>
      {body}
    </Link>
  );
}

export function HomeCouponsPremium() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [openStores, setOpenStores] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hub = await getCoupons();
        if (cancelled) return;
        setItems(
          (hub.coupons || []).map((c) => {
            const mapped = mapSmartCoupon(c);
            const slug = normalizeCouponStoreSlug(mapped.storeCode);
            return smartCouponToPromotion(
              { ...mapped, storeCode: slug },
              resolveStoreLabel(slug, mapped.storeName || c.store || c.storeCode),
            );
          }),
        );
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const storeGroups = useMemo((): StoreGroup[] => {
    const map = new Map<string, StoreGroup>();
    for (const p of items) {
      const slug = normalizeCouponStoreSlug(p.storeSlug);
      const existing = map.get(slug);
      if (existing) {
        existing.coupons.push(p);
      } else {
        map.set(slug, {
          slug,
          name: p.storeName,
          coupons: [p],
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt"));
  }, [items]);

  function toggleStore(slug: string) {
    setOpenStores((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <section id="cupoes" className="scroll-mt-20 border-b border-slate-200 bg-[var(--hm-bg-soft)]">
      <div className="home-fade mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:max-w-7xl">
        <p className="home-section-kicker text-sm font-semibold">Complemento</p>
        <h2 className="mt-3 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          Cupões por loja
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
          Campanhas informativas — separadas do preço observado. Abre uma loja
          para ver os cupões disponíveis.
        </p>

        {loading ? (
          <div className="mt-8 h-32 animate-pulse rounded-xl bg-white/80" />
        ) : storeGroups.length === 0 ? (
          <p className="mt-8 text-sm text-slate-400">Sem campanhas no momento.</p>
        ) : (
          <div className="home-coupon-list mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {storeGroups.map((group) => {
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
                        <span className="block text-sm font-semibold text-slate-900">
                          {group.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {group.coupons.length === 1
                            ? "1 cupão disponível"
                            : `${group.coupons.length} cupões disponíveis`}
                        </span>
                      </span>
                      <span
                        className={`home-coupon-chevron shrink-0 text-slate-400 transition-transform ${
                          isOpen ? "home-coupon-chevron--open" : ""
                        }`}
                        aria-hidden
                      >
                        ▾
                      </span>
                    </button>
                    {isOpen && (
                      <ul className="border-t border-slate-100 bg-slate-50/60 divide-y divide-slate-100">
                        {group.coupons.map((p) => (
                          <li key={`${group.slug}-${p.code}-${p.externalId}`}>
                            <CouponDetailRow promo={p} />
                          </li>
                        ))}
                        <li className="px-4 py-2 sm:px-5">
                          <Link
                            href={`/cupoes/${encodeURIComponent(group.slug)}/`}
                            className="text-xs font-semibold text-[var(--hm-brand)] hover:underline"
                          >
                            Ver todos os cupões {group.name} →
                          </Link>
                        </li>
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-3">
              <Link
                href="/#cupoes"
                className="text-sm font-semibold text-[var(--hm-brand)] hover:underline"
              >
                Ver todas as lojas com cupões →
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
