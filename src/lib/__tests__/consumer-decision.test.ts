import { describe, expect, it } from "vitest";
import {
  buildVerdictFromConsumerDecision,
  consumerConfidencePct,
  consumerVerdictBadge,
  consumerVerdictTone,
  humanConsumerReason,
  resolveConsumerDecision,
  consumerVerdictShortLabel,
  resolveConsumerInsightLabel,
} from "@/lib/consumer-decision";
import type { Product } from "@/lib/types";

const baseProduct = {
  ean: "5601234567892",
  slug: "test",
  name: "GPU Test",
  brand: "NVIDIA",
  category: "Hardware",
  currentPrice: 500,
  offers: [{ store: "Worten", storeName: "Worten", price: 500, url: "https://x" }],
  history: [],
} as unknown as Product;

describe("consumer-decision", () => {
  it("prefers API consumerDecision on product", () => {
    const p = {
      ...baseProduct,
      consumerDecision: {
        verdict: "BUY" as const,
        confidence: 0.72,
        reason: "PRICE_NEAR_HISTORICAL_MIN",
        policy_version: "consumer-decision-v1",
      },
    };
    const cd = resolveConsumerDecision(p);
    expect(cd?.verdict).toBe("BUY");
    expect(consumerVerdictTone(cd!.verdict)).toBe("buy");
    expect(consumerVerdictBadge(cd!.verdict)).toBe("Vale a pena comprar");
    expect(consumerConfidencePct(cd!)).toBe(72);
  });

  it("builds verdict copy from consumerDecision", () => {
    const p = {
      ...baseProduct,
      consumerDecision: {
        verdict: "WAIT" as const,
        confidence: 0.6,
        reason: "PRICE_ELEVATED_VS_HISTORY",
      },
    };
    const v = buildVerdictFromConsumerDecision(p, {
      spanDays: 30,
      storeCount: 2,
      buyableStoreCount: 2,
      observations: 12,
      eligibleObservations: 8,
      bestStoreLabel: "Worten",
      bestStoreBuyable: true,
    });
    expect(v?.title).toBe("Melhor esperar");
    expect(v?.lines[0]).toBe(humanConsumerReason("PRICE_ELEVATED_VS_HISTORY"));
    expect(v?.lines.some((l) => l.includes("Worten"))).toBe(true);
  });

  it("returns null when consumerDecision missing", () => {
    expect(
      buildVerdictFromConsumerDecision(baseProduct, {
        spanDays: 0,
        storeCount: 0,
        buyableStoreCount: 0,
        observations: 0,
        bestStoreLabel: null,
      }),
    ).toBeNull();
  });

  it("uses monitor copy when analytics ready but signal unclear", () => {
    const p = {
      ...baseProduct,
      consumerDecision: {
        verdict: "UNKNOWN" as const,
        confidence: 0.45,
        reason: "PRICE_UNCLEAR_MONITOR",
        evidence: {
          eligible_observations: 3,
          span_days: 33,
          price_change_count: 2,
          buyable_stores: 1,
        },
      },
    };
    const v = buildVerdictFromConsumerDecision(p, {
      spanDays: 33,
      storeCount: 2,
      buyableStoreCount: 1,
      observations: 34,
      eligibleObservations: 3,
      bestStoreLabel: "Worten",
      bestStoreBuyable: true,
    });
    expect(v?.title).toBe("Ainda não sabemos");
    expect(v?.lines[0]).toContain("padrão claro");
  });

  it("uses mature radar copy when span is long but sample is thin", () => {
    const p = {
      ...baseProduct,
      consumerDecision: {
        verdict: "UNKNOWN" as const,
        confidence: 0.4,
        reason: "INSUFFICIENT_SAMPLE",
        evidence: { eligible_observations: 3, span_days: 33 },
      },
    };
    const v = buildVerdictFromConsumerDecision(p, {
      spanDays: 33,
      storeCount: 2,
      buyableStoreCount: 1,
      observations: 34,
      eligibleObservations: 3,
      bestStoreLabel: "Worten",
      bestStoreBuyable: true,
    });
    expect(v?.title).toBe("Ainda não sabemos");
    expect(v?.lines[0]).toContain("um mês no radar");
    expect(v?.lines.some((l) => l.includes("mudanças"))).toBe(true);
  });

  it("short labels for cart and projects", () => {
    const p = {
      ...baseProduct,
      consumerDecision: {
        verdict: "WAIT" as const,
        confidence: 0.5,
        reason: "PRICE_ELEVATED_VS_HISTORY",
      },
    };
    expect(resolveConsumerInsightLabel(p)).toBe("Preço elevado");
  });
});
