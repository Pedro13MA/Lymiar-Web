import { describe, expect, it } from "vitest";
import {
  countBuyableOffers,
  isOfferBuyable,
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

  it("counts buyable stores", () => {
    expect(countBuyableOffers([oos, inStock])).toBe(1);
    expect(isOfferBuyable(inStock)).toBe(true);
    expect(isOfferBuyable(oos)).toBe(false);
  });
});
