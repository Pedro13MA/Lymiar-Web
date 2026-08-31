import type { Offer } from "@/lib/types";

/** Oferta comprável agora (stock confirmado ou desconhecido — não esgotada). */
export function isOfferBuyable(offer: Offer): boolean {
  if (offer.inStock === false || offer.stockStatus === "out_of_stock") {
    return false;
  }
  return true;
}

export function isOfferOutOfStock(offer: Offer): boolean {
  return offer.inStock === false || offer.stockStatus === "out_of_stock";
}

/** Menor preço listado (inclui esgotado). */
export function pickCheapestOffer(offers: Offer[]): Offer | null {
  const sorted = [...offers].filter((o) => o.price > 0).sort((a, b) => a.price - b.price);
  return sorted[0] ?? null;
}

/** Melhor oferta para comprar — prefere stock; fallback ao mais barato listado. */
export function pickBestBuyableOffer(offers: Offer[]): Offer | null {
  const sorted = [...offers].filter((o) => o.price > 0).sort((a, b) => a.price - b.price);
  if (!sorted.length) return null;
  return sorted.find(isOfferBuyable) ?? sorted[0];
}

export function countBuyableOffers(offers: Offer[]): number {
  return offers.filter(isOfferBuyable).length;
}

export function countListedOffers(offers: Offer[]): number {
  return offers.filter((o) => o.price > 0).length;
}
