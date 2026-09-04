"use client";

import { useMemo, useState } from "react";
import type { Offer } from "@/lib/types";
import {
  isOfferBuyable,
  isOfferEligible,
  isOfferOutOfStock,
  offerConditionLabel,
  pickBestBuyableOffer,
  pickCheapestOffer,
} from "@/lib/product-offers";
import { storeDisplayName, storeLogoUrl } from "@/lib/storeLogos";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatEUR } from "@/lib/utils";

type Props = { offers: Offer[] };

function StoreCellLogo({
  name,
  slug,
  logoFromOffer,
}: {
  name: string;
  slug: string;
  logoFromOffer?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const src = logoFromOffer || storeLogoUrl(slug || name);
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";

  if (failed || !src) {
    return (
      <span
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600"
        aria-hidden
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Logo ${name}`}
      width={44}
      height={44}
      className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1.5"
      onError={() => setFailed(true)}
    />
  );
}

function stockStatus(offer: Offer): { label: string; className: string } {
  if (isOfferOutOfStock(offer)) {
    return { label: "Esgotado", className: "text-rose-700" };
  }
  if (offer.inStock === true || offer.stockStatus === "in_stock") {
    return { label: "Disponível", className: "text-emerald-700" };
  }
  return { label: "Consultar loja", className: "text-slate-500" };
}

function humanOrFallback(
  value: string | null | undefined,
  fallback: string,
): string {
  const v = value?.trim();
  if (!v) return fallback;
  if (/varies|n\/a|unknown|tbd|null|undefined/i.test(v)) return fallback;
  return v;
}

function deliveryLabel(offer: Offer): string {
  const fromInfo = humanOrFallback(offer.shippingInfo, "");
  if (fromInfo) return fromInfo;
  if (offer.shippingDetails) {
    const min = offer.shippingDetails.estimatedDaysMin;
    const max = offer.shippingDetails.estimatedDaysMax;
    if (min != null && max != null) {
      return `${min}–${max} dias${
        offer.shippingDetails.supportsPickup ? " · levantamento" : ""
      }`;
    }
  }
  return "Consultar loja";
}

function shippingCostLabel(offer: Offer): string {
  return humanOrFallback(
    offer.shippingDetails?.shippingCost,
    "Depende da encomenda",
  );
}

function sortOffersForDisplay(offers: Offer[]): Offer[] {
  return [...offers]
    .filter((o) => o.price > 0)
    .sort((a, b) => {
      const aBuy = isOfferBuyable(a);
      const bBuy = isOfferBuyable(b);
      if (aBuy !== bBuy) return aBuy ? -1 : 1;
      return a.price - b.price;
    });
}

/** Cartões “Onde comprar” — destaca melhor oferta comprável. */
export function StoreCompareTable({ offers }: Props) {
  const sorted = useMemo(() => sortOffersForDisplay(offers), [offers]);
  const bestBuyable = useMemo(() => pickBestBuyableOffer(offers), [offers]);
  const cheapest = useMemo(() => pickCheapestOffer(offers), [offers]);

  if (!sorted.length) {
    return (
      <p className="text-sm text-slate-500">
        Sem ofertas de loja para este produto neste momento.
      </p>
    );
  }

  const cheapestOosOnly =
    cheapest != null &&
    bestBuyable != null &&
    isOfferOutOfStock(cheapest) &&
    cheapest.price < bestBuyable.price;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {sorted.map((offer) => {
        const slug = offer.slug || offer.store || "";
        const name = storeDisplayName(slug || offer.storeName, offer.storeName);
        const stock = stockStatus(offer);
        const isBestBuyable =
          bestBuyable != null &&
          offer.store === bestBuyable.store &&
          offer.price === bestBuyable.price &&
          offer.condition === bestBuyable.condition &&
          isOfferEligible(offer);
        const conditionLabel = offerConditionLabel(offer.condition);
        const isCheapestOos =
          cheapestOosOnly &&
          offer.store === cheapest!.store &&
          offer.price === cheapest!.price &&
          isOfferOutOfStock(offer);

        return (
          <li
            key={`${offer.store}-${offer.condition ?? "NEW"}-${offer.url}`}
            className={cn(
              "rounded-2xl border border-slate-200/80 bg-white p-4",
              isBestBuyable && "border-emerald-200 bg-emerald-50/40",
              isCheapestOos && "border-amber-200/80 bg-amber-50/30",
            )}
          >
            <div className="flex items-start gap-3">
              <StoreCellLogo
                name={name}
                slug={slug}
                logoFromOffer={offer.logoUrl}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900">{name}</p>
                  <p className="font-display text-lg font-bold tabular-nums text-slate-900">
                    {formatEUR(offer.price)}
                  </p>
                </div>

                {isBestBuyable ? (
                  <p className="mt-1 text-xs font-semibold text-emerald-800">
                    ⭐ Melhor preço novo disponível
                  </p>
                ) : isCheapestOos ? (
                  <p className="mt-1 text-xs font-semibold text-amber-800">
                    Menor preço listado — esgotado
                  </p>
                ) : conditionLabel ? (
                  <p className="mt-1 text-xs font-medium text-amber-800">{conditionLabel}</p>
                ) : null}

                <dl className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="inline text-slate-400">Disponibilidade · </dt>
                    <dd className={cn("inline font-medium", stock.className)}>
                      {stock.label}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-400">Entrega · </dt>
                    <dd className="inline">{deliveryLabel(offer)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="inline text-slate-400">Portes · </dt>
                    <dd className="inline">{shippingCostLabel(offer)}</dd>
                  </div>
                </dl>

                <a
                  href={offer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({
                      variant: isOfferBuyable(offer) ? "default" : "outline",
                      size: "default",
                    }),
                    "mt-4 w-full justify-center font-semibold",
                    !isOfferBuyable(offer) && "border-slate-300 text-slate-700",
                  )}
                >
                  {isOfferBuyable(offer) ? "Comprar" : "Ver na loja"}
                </a>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
