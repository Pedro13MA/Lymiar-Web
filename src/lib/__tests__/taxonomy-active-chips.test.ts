import { describe, it, expect } from "vitest";
import {
  buildActiveFilterChips,
  removeActiveFilterChip,
  withPriceSelection,
} from "@/lib/taxonomy-facets";

describe("active filter chips", () => {
  it("builds chips for brand, store and price", () => {
    const chips = buildActiveFilterChips(
      {
        brand: ["asus"],
        store: ["globaldata"],
        price_min: ["100"],
        price_max: ["500"],
      },
      [
        {
          id: "brand",
          label: "Marca",
          type: "enum",
          values: [{ value: "asus", label: "ASUS", count: 3 }],
        },
        {
          id: "store",
          label: "Loja",
          type: "enum",
          values: [{ value: "globaldata", label: "Globaldata", count: 6 }],
        },
      ],
    );
    expect(chips.map((c) => c.label)).toEqual(
      expect.arrayContaining([
        "Marca: ASUS",
        "Loja: Globaldata",
        "≥ 100 €",
        "≤ 500 €",
      ]),
    );
  });

  it("removes a single chip value", () => {
    const next = removeActiveFilterChip(
      { brand: ["asus", "msi"], price_min: ["100"] },
      { facetId: "brand", value: "asus" },
    );
    expect(next.brand).toEqual(["msi"]);
    expect(next.price_min).toEqual(["100"]);
  });

  it("merges price drafts into selection", () => {
    const next = withPriceSelection({ brand: ["asus"] }, "50", "");
    expect(next.brand).toEqual(["asus"]);
    expect(next.price_min).toEqual(["50"]);
    expect(next.price_max).toBeUndefined();
  });
});
