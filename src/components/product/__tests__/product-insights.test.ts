/**
 * FASE 7.16 — Product Insights (FE).
 */
import { describe, expect, it } from "vitest";
import {
  computeProductInsights,
  priceInsightShort,
  resolveProductInsights,
} from "@/lib/product-insights-buying";
import { buildCompareRows } from "@/lib/compare-engine";
import type { Product } from "@/lib/types";

function baseProduct(over: Partial<Product> = {}): Product {
  const history = Array.from({ length: 12 }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, "0")}`,
    price: 120 - i,
  }));
  return {
    slug: "gpu-test",
    ean: "123",
    name: "ASUS TUF RTX 5070",
    brand: "ASUS",
    category: "Componentes",
    subcategory: "gpu",
    leafId: "gpu",
    currentPrice: 109,
    avg30d: 115,
    historicalMin: 108,
    historicalMax: 140,
    history,
    offers: [
      {
        store: "a",
        storeName: "A",
        slug: "a",
        price: 109,
        currency: "EUR",
        url: "https://example.com/a",
      },
      {
        store: "b",
        storeName: "B",
        slug: "b",
        price: 112,
        currency: "EUR",
        url: "https://example.com/b",
      },
      {
        store: "c",
        storeName: "C",
        slug: "c",
        price: 111,
        currency: "EUR",
        url: "https://example.com/c",
      },
    ],
    decision: {
      finalScore: 80,
      publish: true,
      tier: "A",
      reason: "ok",
      breakdown: {
        baseQuality: 1,
        priceOpportunity: 1,
        trend: 1,
        rarity: 1,
        categoryOverload: 0,
        storeDominance: 0,
        feedbackAdjustment: 0,
      },
      discountPct: 10,
      dealQuality: "GOOD_DEAL",
      opportunityType: "PRICE_DROP",
      isHistoricalMin: false,
      cheapestStore: "a",
      feedCategory: "hardware",
      bullets: [],
      semaphore: "buy",
      lymiarIndex: {
        value: 82,
        summary: "Bom momento",
        factors: {
          vsAvg30d: { score: 0, label: "Preço vs média 30d", detail: "—" },
          historicalMin: { score: 0, label: "Mínimo histórico", detail: "—" },
          couponApplied: { score: 0, label: "Cupão aplicado", detail: "—" },
          volatility: { score: 0, label: "Volatilidade", detail: "—" },
        },
      },
    },
    seasonality: { timesBelowCurrent12m: 0, note: "", markers: [] },
    knowledgeCompleteness: 70,
    sampleDays: 12,
    ...over,
  };
}

describe("FASE 7.16 insights", () => {
  it("pouco histórico → INSUFFICIENT_DATA", () => {
    const i = computeProductInsights(
      baseProduct({
        history: [
          { date: "2026-01-01", price: 100 },
          { date: "2026-01-02", price: 99 },
        ],
      }),
    );
    expect(i.recommendation).toBe("INSUFFICIENT_DATA");
    expect(i.summary.join(" ").toLowerCase()).toMatch(/evidências|insuficiente/);
  });

  it("histórico fino não reivindica mínimo mesmo com isHistoricalMin", () => {
    const i = computeProductInsights(
      baseProduct({
        sampleDays: 2,
        consumerDecision: {
          verdict: "UNKNOWN",
          confidence: 0.2,
          reason: "THIN_HISTORY",
          evidence: { sample_days: 2 },
        },
        currentPrice: 108,
        historicalMin: 108,
        decision: {
          ...baseProduct().decision,
          isHistoricalMin: true,
        },
      }),
    );
    expect(i.currentPosition).toBe("insufficient");
    expect(i.atNewMinimum).toBe(false);
    expect(i.lowestHistorical).toBeNull();
  });

  it("histórico completo perto do mínimo", () => {
    const i = computeProductInsights(
      baseProduct({
        sampleDays: 12,
        consumerDecision: {
          verdict: "BUY",
          confidence: 0.8,
          reason: "PRICE_NEAR_HISTORICAL_MIN",
          evidence: { sample_days: 12 },
        },
        currentPrice: 108,
        historicalMin: 108,
        decision: {
          ...baseProduct().decision,
          isHistoricalMin: true,
        },
      }),
    );
    expect(i.currentPosition).toBe("near_minimum");
    expect(i.recommendation).toBe("WATCH");
    expect(i.confidence).toBeGreaterThanOrEqual(40);
    expect(i.dataQuality).toBeGreaterThanOrEqual(1);
  });

  it("uma loja", () => {
    const i = computeProductInsights(
      baseProduct({
        offers: [
          {
            store: "only",
            storeName: "Only",
            slug: "only",
            price: 109,
            currency: "EUR",
            url: "https://example.com",
          },
        ],
      }),
    );
    expect(i.availability).toBe("one");
  });

  it("cupões", () => {
    const withC = computeProductInsights(
      baseProduct({ storeCouponsAvailable: true }),
    );
    const noC = computeProductInsights(baseProduct({ storeCouponsAvailable: false }));
    expect(withC.couponStatus).toBe("with_coupon");
    expect(noC.couponStatus).toBe("no_coupon");
  });

  it("API insights preferido", () => {
    const i = resolveProductInsights(
      baseProduct({
        insights: {
          currentPosition: "average",
          currentPositionLabel: "Preço na média observada",
          priceTrend: "stable",
          priceTrendLabel: "Estável",
          availability: "many",
          availabilityLabel: "Muitas lojas",
          priceVolatility: "low",
          priceVolatilityLabel: "Baixa",
          recommendation: "WATCH",
          recommendationLabel: "Monitorizar",
          confidence: 55,
          dataQuality: 3,
          cards: [{ id: "x", tone: "neutral", label: "API card" }],
          summary: ["Da API"],
          pros: [],
          cons: [],
          timeline: [],
        },
      }),
    );
    expect(i.cards[0].label).toBe("API card");
    expect(i.recommendation).toBe("WATCH");
  });

  it("sem ConsumerDecision não promove BUY_NOW local", () => {
    const i = resolveProductInsights(
      baseProduct({
        insights: {
          currentPosition: "near_minimum",
          currentPositionLabel: "Perto do mínimo",
          priceTrend: "stable",
          priceTrendLabel: "Estável",
          availability: "many",
          availabilityLabel: "Muitas lojas",
          priceVolatility: "low",
          priceVolatilityLabel: "Baixa",
          recommendation: "BUY_NOW",
          recommendationLabel: "Comprar agora",
          confidence: 80,
          dataQuality: 4,
          cards: [{ id: "x", tone: "positive", label: "Local" }],
          summary: ["Inventado"],
          pros: [],
          cons: [],
          timeline: [],
        },
      }),
    );
    expect(i.recommendation).toBe("INSUFFICIENT_DATA");
  });

  it("ConsumerDecision override insights recommendation", () => {
    const i = resolveProductInsights(
      baseProduct({
        consumerDecision: {
          verdict: "WAIT",
          confidence: 0.8,
          reason: "PRICE_ELEVATED_VS_HISTORY",
        },
        insights: {
          currentPosition: "elevated",
          currentPositionLabel: "Elevado",
          priceTrend: "up",
          priceTrendLabel: "A subir",
          availability: "many",
          availabilityLabel: "Muitas lojas",
          priceVolatility: "low",
          priceVolatilityLabel: "Baixa",
          recommendation: "BUY_NOW",
          recommendationLabel: "Comprar agora",
          confidence: 90,
          dataQuality: 3,
          cards: [{ id: "x", tone: "good", label: "API card" }],
          summary: ["Da API"],
          pros: [],
          cons: [],
          timeline: [],
        },
      }),
    );
    expect(i.recommendation).toBe("WAIT");
    expect(i.cards[0].label).toBe("API card");
  });

  it("comparador inclui secção insights", () => {
    const rows = buildCompareRows([
      baseProduct({ slug: "a" }),
      baseProduct({
        slug: "b",
        currentPrice: 135,
        historicalMin: 100,
        history: Array.from({ length: 12 }, (_, i) => ({
          date: `2026-01-${String(i + 1).padStart(2, "0")}`,
          price: 100 + i * 3,
        })),
      }),
    ]);
    const insightRows = rows.filter((r) => r.group === "insights");
    expect(insightRows.length).toBeGreaterThanOrEqual(2);
  });

  it("priceInsightShort para projetos", () => {
    expect(
      priceInsightShort(
        baseProduct({
          history: [{ date: "2026-01-01", price: 100 }],
        }),
      ),
    ).toBe("Sem dados suficientes");
  });

  it("pros/cons factuais para SEO", () => {
    const i = computeProductInsights(baseProduct());
    expect(Array.isArray(i.pros)).toBe(true);
    expect(Array.isArray(i.cons)).toBe(true);
    expect(i.timeline.some((e) => e.id === "today")).toBe(true);
  });
});
