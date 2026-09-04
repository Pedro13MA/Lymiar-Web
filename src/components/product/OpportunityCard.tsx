"use client";

import { memo, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { Product } from "@/lib/types";
import { CompareAddButton } from "@/components/product/CompareAddButton";
import { FavoriteLoginPrompt } from "@/components/product/FavoriteLoginPrompt";
import { FavoritesListsDrawer } from "@/components/user-space/FavoritesListsDrawer";
import { useSession } from "@/components/auth/SessionProvider";
import { buildProductCardVerdict } from "@/lib/consumer-decision";
import { normalizeVerdictTone } from "@/lib/verdict-styles";
import { referenceSourceTooltip } from "@/lib/referenceSource";
import {
  isFavorite,
  snapshotFromProduct,
  subscribeUserSpace,
} from "@/lib/user-space";
import { formatEUR, formatPct, cn } from "@/lib/utils";
import "./OpportunityCard.css";

type Props = {
  product: Product;
  showDropToday?: boolean;
  /** Homepage / categoria: decisão alinhada com PDP. */
  compact?: boolean;
  detectedAt?: string | null;
};

function opportunityCardPropsAreEqual(prev: Props, next: Props): boolean {
  if (prev.compact !== next.compact) return false;
  if (prev.showDropToday !== next.showDropToday) return false;
  if (prev.detectedAt !== next.detectedAt) return false;
  const a = prev.product;
  const b = next.product;
  return (
    a.ean === b.ean &&
    a.slug === b.slug &&
    a.currentPrice === b.currentPrice &&
    a.historicalMin === b.historicalMin &&
    a.historicalMax === b.historicalMax &&
    a.name === b.name &&
    a.imageUrl === b.imageUrl &&
    a.decision.semaphore === b.decision.semaphore &&
    a.consumerDecision?.verdict === b.consumerDecision?.verdict &&
    a.consumerDecision?.reason === b.consumerDecision?.reason
  );
}

function ProductCardActions({ product }: { product: Product }) {
  const { status } = useSession();
  const [fav, setFav] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [heartPulse, setHeartPulse] = useState(false);
  const snap = snapshotFromProduct(product);

  const refreshFav = useCallback(async () => {
    setFav(await isFavorite(product.slug));
  }, [product.slug]);

  useEffect(() => {
    void refreshFav();
    const unsub = subscribeUserSpace(() => {
      void refreshFav();
    });
    return unsub;
  }, [refreshFav]);

  const onFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status !== "authenticated") {
      setLoginOpen(true);
      return;
    }
    setListOpen(true);
    if (!fav) {
      setHeartPulse(true);
      window.setTimeout(() => setHeartPulse(false), 450);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={fav}
          aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          onClick={onFavorite}
          className={cn(
            "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors",
            fav
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-[var(--hm-line,#dde3ea)] bg-white text-[var(--hm-ink,#0b1220)] hover:border-rose-300 hover:bg-rose-50/60",
          )}
        >
          <Heart
            className={cn(
              "h-4 w-4 shrink-0",
              fav && "fill-current",
              heartPulse && "lymiar-anim-heart",
            )}
            aria-hidden
          />
          {fav ? "Guardado" : "Favorito"}
        </button>
        <CompareAddButton
          product={product}
          variant="card"
          className="flex-1"
        />
      </div>

      <FavoritesListsDrawer
        open={listOpen}
        onClose={() => setListOpen(false)}
        product={snap}
        onSaved={() => {
          void refreshFav();
        }}
      />

      <FavoriteLoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

export const OpportunityCard = memo(function OpportunityCard({
  product,
  showDropToday,
  compact,
}: Props) {
  const currentPrice = product.currentPrice;
  const historicalMin = product.historicalMin;
  const historicalMax = product.historicalMax;
  const verdict = buildProductCardVerdict(product);
  const tone = normalizeVerdictTone(verdict.tone);
  const href = `/p/?id=${encodeURIComponent(product.slug)}`;

  const realDiscount =
    product.realDiscountPct != null
      ? product.realDiscountPct
      : product.decision.discountPct > 0
        ? product.decision.discountPct
        : null;

  let discountLabel: string | null = null;
  let discountTooltip = "";
  if (showDropToday && product.dropTodayPct && Math.abs(product.dropTodayPct) >= 1) {
    discountLabel = formatPct(product.dropTodayPct);
    discountTooltip = "Queda face a ontem";
  } else if (realDiscount != null && realDiscount >= 1) {
    discountLabel = formatPct(realDiscount);
    discountTooltip = referenceSourceTooltip(product.referenceSource);
  }

  return (
    <article
      className={cn("lymiar-product-card", `lymiar-product-card--${tone}`)}
    >
      <Link href={href} className="lymiar-product-card__link">
        <div className="lymiar-product-card__media">
          <div className="lymiar-product-card__media-inner">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-contain"
                sizes="(max-width:640px) 90vw, (max-width:1024px) 40vw, 280px"
                loading="lazy"
                quality={90}
                unoptimized
              />
            ) : null}
          </div>
          <div className="lymiar-product-card__media-fade" aria-hidden />
        </div>

        <div
          className={cn(
            "lymiar-product-card__verdict-bar",
            `lymiar-product-card__verdict-bar--${tone}`,
          )}
        >
          {verdict.badge}
        </div>

        <div className="lymiar-product-card__body">
          <p className="lymiar-product-card__name">
            {product.condition && product.condition !== "NEW" ? (
              <span className="mr-1.5 inline-block rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-amber-900">
                {product.condition === "REFURBISHED"
                  ? "Recond."
                  : product.condition === "OPEN_BOX"
                    ? "Open box"
                    : "Outlet"}
              </span>
            ) : null}
            {product.name}
          </p>

          <div className="flex items-baseline justify-between gap-2">
            <p className="lymiar-product-card__price-now">
              {formatEUR(currentPrice)}
            </p>
            {discountLabel ? (
              <span
                className="cursor-help text-xs font-semibold text-[var(--verdict-buy-text,#007a33)]"
                title={discountTooltip}
              >
                {discountLabel}
              </span>
            ) : null}
          </div>

          <div className="lymiar-product-card__range" aria-label="Intervalo de preços observados">
            <div className="lymiar-product-card__range-row">
              <span>Mín. observado</span>
              <strong>{formatEUR(historicalMin)}</strong>
            </div>
            <div className="lymiar-product-card__sep" aria-hidden />
            <div className="lymiar-product-card__range-row">
              <span>Máx. observado</span>
              <strong>{formatEUR(historicalMax)}</strong>
            </div>
          </div>

          <p className="lymiar-product-card__reason">{verdict.reason}</p>
        </div>
      </Link>

      <div className="lymiar-product-card__actions">
        <Link href={href} className="lymiar-product-card__cta">
          Ver produto
        </Link>
        {!compact ? <ProductCardActions product={product} /> : null}
      </div>
    </article>
  );
}, opportunityCardPropsAreEqual);
