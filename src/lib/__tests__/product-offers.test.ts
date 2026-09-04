import { describe, expect, it } from "vitest";
import {
  countBuyableOffers,
  isOfferBuyable,
  isOfferEligible,
  pickBestBuyableOffer,
  pickCheapestOffer,
} from "@/lib/product-offers";
import type { Offer } from "@/lib/types";

const oos: Offer = {
  store: "global",
  storeName: "Globaldata",
  price: 100,
  url: "https://a",
  inStock: false,
  stockStatus: "out_of_stock",
};

const inStock: Offer = {
  store: "worten",
  storeName: "Worten",
  price: 120,
  url: "https://b",
  inStock: true,
  stockStatus: "in_stock",
};

describe("product-offers", () => {
  it("prefers buyable offer over cheaper OOS", () => {
    expect(pickBestBuyableOffer([oos, inStock])).toBe(inStock);
    expect(pickCheapestOffer([oos, inStock])).toBe(oos);
  });

  it("prefers NEW over cheaper refurbished", () => {
    const refurb: Offer = {
      store: "powerplanet",
      storeName: "Powerplanet",
      price: 608,
      url: "https://c",
      inStock: true,
      condition: "REFURBISHED",
    };
    const newer: Offer = { ...inStock, store: "global", storeName: "Globaldata", price: 769.9 };
    expect(pickBestBuyableOffer([refurb, newer])).toBe(newer);
    expect(isOfferEligible(refurb)).toBe(false);
    expect(countBuyableOffers([refurb, newer])).toBe(1);
  });
});
