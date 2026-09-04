"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Heart } from "lucide-react";
import { ProductGallery } from "@/components/product/ProductGallery";
import { AlertRuleModal } from "@/components/user-space/AlertRuleModal";
import { FavoritesListsDrawer } from "@/components/user-space/FavoritesListsDrawer";
import { useSnackbar } from "@/components/user-space/Snackbar";
import {
  getAlertForProduct,
  isFavorite,
  snapshotFromProduct,
  subscribeUserSpace,
} from "@/lib/user-space";
import type { Product } from "@/lib/types";
import { cn, formatEUR } from "@/lib/utils";
import { storeDisplayName } from "@/lib/storeLogos";
import { displayLeafOrBrand } from "@/lib/product-display";
import {
  isOfferOutOfStock,
  offerConditionLabel,
  pickBestBuyableOffer,
  pickCheapestOffer,
} from "@/lib/product-offers";

type Props = {
  product: Product;
};

function humanDelivery(shippingInfo?: string | null): string {
  const v = shippingInfo?.trim();
  if (!v) return "Consultar loja";
  if (/varies|n\/a|unknown|tbd/i.test(v)) return "Consultar loja";
  return v;
}

function humanShippingCost(raw?: string | null): string {
  const v = raw?.trim();
  if (!v) return "Depende da encomenda";
  if (/varies|n\/a|unknown|tbd/i.test(v)) return "Depende da encomenda";
  return v;
}

export function ProductHero({ product }: Props) {
  const { push } = useSnackbar();

  const categoryLabel = displayLeafOrBrand({
    subcategoryLabel: product.subcategoryLabel,
    leafId: product.leafId,
    taxonomyPath: product.taxonomyPath,
    category: product.category,
    brand: product.brand,
  });

  const cheapestOffer = useMemo(
    () => pickCheapestOffer(product.offers ?? []),
    [product.offers],
  );
  const buyableOffer = useMemo(
    () => pickBestBuyableOffer(product.offers ?? []),
    [product.offers],
  );
  const heroOffer = buyableOffer ?? cheapestOffer;
  const heroConditionLabel = offerConditionLabel(
    heroOffer?.condition ?? product.condition,
  );
  const cheapestIsOos =
    cheapestOffer != null &&
    buyableOffer != null &&
    cheapestOffer.price < buyableOffer.price &&
    isOfferOutOfStock(cheapestOffer);

  const bestStore = heroOffer?.storeName || heroOffer?.store || null;
  const buyUrl = heroOffer?.url || null;

  const [fav, setFav] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [alertActive, setAlertActive] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [heartPulse, setHeartPulse] = useState(false);
  const [bellPulse, setBellPulse] = useState(false);

  const refreshUserSpace = useCallback(async () => {
    setFav(await isFavorite(product.slug));
    const alert = await getAlertForProduct(product.slug);
    setAlertActive(Boolean(alert?.active));
  }, [product.slug]);

  useEffect(() => {
    void refreshUserSpace();
    const unsub = subscribeUserSpace(() => {
      void refreshUserSpace();
    });
    return () => {
      unsub();
    };
  }, [product.slug, refreshUserSpace]);

  const snap = snapshotFromProduct(product);

  return (
    <>
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
        <ProductGallery
          product={product}
          showThumbnails={false}
          className="[&>button]:h-64 sm:[&>button]:h-80 md:[&>button]:h-[30rem]"
        />

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {product.brand ? (
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {product.brand}
              </p>
            ) : null}
            {categoryLabel &&
            categoryLabel.toLowerCase() !== (product.brand || "").toLowerCase() ? (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {categoryLabel}
              </span>
            ) : null}
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-[2.5rem] md:leading-tight">
            {product.name}
          </h1>

          <p className="font-display text-4xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-[2.75rem]">
            {formatEUR(heroOffer?.price ?? product.currentPrice)}
          </p>
          {heroConditionLabel ? (
            <p className="text-sm font-medium text-amber-800">{heroConditionLabel}</p>
          ) : null}

          <div className="space-y-1.5 text-sm text-slate-600">
            {bestStore ? (
              <p>
                <span className="text-slate-500">
                  {buyableOffer
                    ? "Melhor preço disponível · "
                    : "Menor preço listado · "}
                </span>
                <span className="font-medium text-slate-900">
                  {storeDisplayName(bestStore, bestStore)}
                </span>
                {!buyableOffer && cheapestOffer ? (
                  <span className="text-rose-700"> · esgotado</span>
                ) : null}
              </p>
            ) : null}
            {cheapestIsOos ? (
              <p className="text-xs text-slate-500">
                {formatEUR(cheapestOffer!.price)} em{" "}
                {storeDisplayName(
                  cheapestOffer!.storeName || cheapestOffer!.store || "",
                  cheapestOffer!.storeName,
                )}{" "}
                — esgotado. Comprar em{" "}
                {storeDisplayName(
                  buyableOffer!.storeName || buyableOffer!.store || "",
                  buyableOffer!.storeName,
                )}{" "}
                por {formatEUR(buyableOffer!.price)}.
              </p>
            ) : null}
            <p>
              <span className="text-slate-500">Entrega · </span>
              <span className="font-medium text-slate-900">
                {humanDelivery(heroOffer?.shippingInfo)}
              </span>
            </p>
            <p>
              <span className="text-slate-500">Portes · </span>
              <span className="font-medium text-slate-900">
                {humanShippingCost(heroOffer?.shippingDetails?.shippingCost)}
              </span>
            </p>
          </div>

          <div className="pdp-actions mt-2 w-full max-w-md">
            {buyUrl ? (
              <a
                href={buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pdp-cta"
              >
                {buyableOffer ? "Ver na loja" : "Consultar na loja"}
              </a>
            ) : null}

            <div className="pdp-actions-row">
              <button
                type="button"
                aria-pressed={fav}
                onClick={() => {
                  setListOpen(true);
                  if (!fav) {
                    setHeartPulse(true);
                    window.setTimeout(() => setHeartPulse(false), 450);
                  }
                }}
                className={cn(
                  "pdp-action-btn",
                  fav && "pdp-action-btn--on",
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

              <button
                type="button"
                aria-pressed={alertActive}
                onClick={() => {
                  setAlertOpen(true);
                  setBellPulse(true);
                  window.setTimeout(() => setBellPulse(false), 550);
                }}
                className={cn(
                  "pdp-action-btn",
                  alertActive && "pdp-action-btn--on",
                )}
              >
                <Bell
                  className={cn(
                    "h-4 w-4 shrink-0",
                    bellPulse && "lymiar-anim-bell",
                  )}
                  aria-hidden
                />
                {alertActive ? "A seguir" : "Alerta"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <FavoritesListsDrawer
        open={listOpen}
        onClose={() => setListOpen(false)}
        product={snap}
        onSaved={(ids) => {
          void refreshUserSpace();
          if (ids.length) {
            setHeartPulse(true);
            window.setTimeout(() => setHeartPulse(false), 450);
          }
          push(
            ids.length
              ? "Produto adicionado aos favoritos."
              : "Removido das listas.",
          );
        }}
      />

      <AlertRuleModal
        variant="product"
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        product={snap}
        historicalMin={product.historicalMin}
        onSaved={() => {
          void refreshUserSpace();
          setBellPulse(true);
          window.setTimeout(() => setBellPulse(false), 550);
          push("Alerta por email activado.");
        }}
      />
    </>
  );
}
