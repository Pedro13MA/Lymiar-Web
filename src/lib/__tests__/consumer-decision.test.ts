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
      observations: 12,
      bestStoreLabel: "Worten",
    });
    expect(v?.title).toBe("Recomendamos esperar");
    expect(v?.lines[0]).toBe(humanConsumerReason("PRICE_ELEVATED_VS_HISTORY"));
    expect(v?.lines.some((l) => l.includes("Worten"))).toBe(true);
  });

  it("returns null when consumerDecision missing", () => {
    expect(
      buildVerdictFromConsumerDecision(baseProduct, {
        spanDays: 0,
        storeCount: 0,
        observations: 0,
        bestStoreLabel: null,
      }),
    ).toBeNull();
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
