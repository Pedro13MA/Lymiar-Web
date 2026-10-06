/**
 * FASE 7.8 / 7.10 — conteúdo / specs / FAQ a partir de dados existentes.
 */

import { describe, expect, it } from "vitest";
import {
  buildAutoDescription,
  buildProductFaq,
  buildSpecRows,
  buildUsefulDescription,
  collectImageUrls,
  parseTypedAttributes,
} from "@/lib/product-content";
import {
  displayCategoryLabel,
  displayLeafOrBrand,
  isOtherLabel,
} from "@/lib/product-display";
import { buildPremiumProductBreadcrumbs } from "@/lib/product-breadcrumb-premium";
import type { Product } from "@/lib/types";

function baseProduct(over: Partial<Product> = {}): Product {
  return {
    slug: "rtx-5070-asus",
    ean: "1",
    name: "ASUS TUF RTX 5070",
    brand: "ASUS",
    category: "hardware",
    subcategory: "gpu",
    subcategoryLabel: "Placas Gráficas",
    leafId: "gpu",
    currentPrice: 649,
    avg30d: 680,
    historicalMin: 620,
    historicalMax: 799,
    history: [{ date: "2026-01-01", price: 650 }],
    offers: [
      {
        store: "globaldata",
        storeName: "Globaldata",
        url: "https://example.com",
        price: 649,
      },
    ],
    decision: {
      finalScore: 88,
      publish: true,
      tier: "S",
      reason: "ok",
      breakdown: {
        baseQuality: 0,
        priceOpportunity: 0,
        trend: 0,
        rarity: 0,
        categoryOverload: 0,
        storeDominance: 0,
        feedbackAdjustment: 0,
      },
      discountPct: 10,
      dealQuality: "VERY_GOOD_DEAL",
      opportunityType: "NEW_LOW",
      isHistoricalMin: true,
      cheapestStore: "globaldata",
      feedCategory: "hardware",
      bullets: [],
      semaphore: "buy",
      lymiarIndex: {
        value: 88,
        summary: "ok",
        factors: {
          vsAvg30d: { score: 0, label: "Preço vs média 30d", detail: "—" },
          historicalMin: { score: 0, label: "Mínimo histórico", detail: "—" },
          couponApplied: { score: 0, label: "Cupão aplicado", detail: "—" },
          volatility: { score: 0, label: "Volatilidade", detail: "—" },
        },
      },
    },
    seasonality: {
      timesBelowCurrent12m: 2,
      note: "",
      markers: [],
    },
    condition: "NEW",
    typedAttributes: { vram_gb: 12, pcie: "5.0", rgb: true },
    chipsetModel: "RTX 5070",
    imageUrl: "https://cdn.example/a.jpg",
    imageUrls: ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"],
    ...over,
  };
}

describe("product-content", () => {
  it("parseTypedAttributes", () => {
    expect(parseTypedAttributes({ a: 1 })).toEqual({ a: 1 });
    expect(parseTypedAttributes('{"vram_gb":16}')).toEqual({ vram_gb: 16 });
    expect(parseTypedAttributes(null)).toEqual({});
  });

  it("buildSpecRows — GPU attrs only from data", () => {
    const rows = buildSpecRows(baseProduct());
    const keys = rows.map((r) => r.key);
    expect(keys).toContain("vram_gb");
    expect(keys).toContain("pcie");
    expect(keys).toContain("chipset");
    expect(rows.find((r) => r.key === "rgb")?.value).toBe("Sim");
    expect(rows.find((r) => r.key === "vram_gb")?.value).toMatch(/12/);
  });

  it("buildUsefulDescription — GPU from typed attrs, never generic Other", () => {
    const d = buildUsefulDescription(baseProduct());
    expect(d).toBeTruthy();
    expect(d!).toMatch(/RTX 5070/i);
    expect(d!).toMatch(/12/);
    expect(d!.toLowerCase()).not.toContain("other");
    expect(d!.toLowerCase()).not.toContain("consulte preços");
    expect(d!.toLowerCase()).not.toContain("resumo institucional");
  });

  it("buildUsefulDescription — null when insufficient data", () => {
    const d = buildUsefulDescription(
      baseProduct({
        leafId: "accessory",
        subcategory: "accessory",
        typedAttributes: {},
        chipsetModel: null,
        vramSpec: null,
        brand: null,
      }),
    );
    expect(d).toBeNull();
  });

  it("buildAutoDescription — summary null hides fluff", () => {
    const d = buildAutoDescription(
      baseProduct({
        leafId: "accessory",
        subcategory: "accessory",
        typedAttributes: {},
        chipsetModel: null,
        vramSpec: null,
        brand: null,
        name: "Cabo USB",
      }),
    );
    expect(d.summary).toBeNull();
  });

  it("buildProductFaq — uses real condition and stores", () => {
    const faq = buildProductFaq(baseProduct());
    expect(faq.some((f) => f.question.includes("novo"))).toBe(true);
    // Honesty: amostra fina → sem claim de mínimo histórico
    expect(faq.some((f) => /m[ií]nimo/i.test(f.answer))).toBe(false);
    expect(faq.every((f) => f.answer.trim().length > 0)).toBe(true);
  });

  it("buildProductFaq — mínimo histórico só com sample_days suficiente", () => {
    const faq = buildProductFaq(
      baseProduct({
        sampleDays: 14,
        consumerDecision: {
          verdict: "BUY",
          confidence: 0.8,
          reason: "PRICE_NEAR_HISTORICAL_MIN",
          evidence: { sample_days: 14 },
        },
      }),
    );
    expect(faq.some((f) => f.answer.includes("620") || /m[ií]nimo/i.test(f.answer))).toBe(
      true,
    );
  });

  it("collectImageUrls dedupes", () => {
    expect(collectImageUrls(baseProduct())).toHaveLength(2);
  });
});

describe("product-display — never Other", () => {
  it("isOtherLabel", () => {
    expect(isOtherLabel("Other")).toBe(true);
    expect(isOtherLabel("Placas Gráficas")).toBe(false);
  });

  it("displayCategoryLabel skips Other", () => {
    expect(displayCategoryLabel("Other", "gpu")).toBe("gpu");
    expect(displayCategoryLabel("Other")).toBeNull();
  });

  it("displayLeafOrBrand falls back to brand", () => {
    expect(
      displayLeafOrBrand({
        category: "Other",
        brand: "ASUS",
      }),
    ).toBe("ASUS");
  });

  it("breadcrumbs never include Other", () => {
    const crumbs = buildPremiumProductBreadcrumbs({
      category: "Other",
      subcategory: "gpu",
      subcategoryLabel: "Placas Gráficas",
      leafId: "gpu",
      chipsetModel: "RTX 5070",
    });
    expect(crumbs.every((c) => !isOtherLabel(c.label))).toBe(true);
    expect(crumbs[0]?.label).toBe("Explorar");
    expect(crumbs.some((c) => c.label.includes("Gráficas") || c.label === "Placas Gráficas")).toBe(
      true,
    );
    expect(crumbs.some((c) => c.label.includes("RTX"))).toBe(false);
  });

  it("breadcrumbs parse JSON taxonomy arrays and omit product name", () => {
    const crumbs = buildPremiumProductBreadcrumbs({
      taxonomyPath: '["telemoveis","smartphones"]',
      productName: "iPhone 15 128GB",
    });
    expect(crumbs.map((c) => c.label)).toEqual([
      "Explorar",
      "Telemóveis",
      "Smartphones",
    ]);
    expect(crumbs.some((c) => c.label.includes("iPhone"))).toBe(false);
    expect(crumbs.every((c) => !c.label.includes("["))).toBe(true);
  });
});
