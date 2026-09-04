import type { Offer, OfferCondition } from "@/lib/types";

function normalizeOfferCondition(raw: Offer["condition"]): OfferCondition | null {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase();
  if (s === "NEW" || s === "REFURBISHED" || s === "OPEN_BOX" || s === "OUTLET") {
    return s;
  }
  return null;
}

/** NEW + stock confirmado — baseline para melhor preço e decisão. */
export function isOfferEligible(offer: Offer): boolean {
  if (offer.inStock === false || offer.stockStatus === "out_of_stock") {
    return false;
  }
  const cond = normalizeOfferCondition(offer.condition);
  return cond === "NEW" || cond === null;
}

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

export function offerConditionLabel(condition: Offer["condition"]): string | null {
  const c = normalizeOfferCondition(condition);
  if (!c || c === "NEW") return null;
  if (c === "REFURBISHED") return "Recondicionado";
  if (c === "OPEN_BOX") return "Open box";
  if (c === "OUTLET") return "Outlet";
  return c;
}

/** Menor preço listado (inclui esgotado). */
export function pickCheapestOffer(offers: Offer[]): Offer | null {
  const sorted = [...offers].filter((o) => o.price > 0).sort((a, b) => a.price - b.price);
  return sorted[0] ?? null;
}

/** Melhor oferta NEW comprável — não mistura recondicionado/outlet com novo. */
export function pickBestBuyableOffer(offers: Offer[]): Offer | null {
  const sorted = [...offers].filter((o) => o.price > 0).sort((a, b) => a.price - b.price);
  if (!sorted.length) return null;
  const eligible = sorted.find((o) => isOfferEligible(o));
  if (eligible) return eligible;
  return sorted.find(isOfferBuyable) ?? sorted[0];
}

export function countBuyableOffers(offers: Offer[]): number {
  return offers.filter(isOfferEligible).length;
}

export function countListedOffers(offers: Offer[]): number {
  return offers.filter((o) => o.price > 0).length;
}
