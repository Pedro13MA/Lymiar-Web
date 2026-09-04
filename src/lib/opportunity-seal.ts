import type { Product } from "@/lib/types";
import { formatEUR, formatPct, type DecisionUiKind } from "@/lib/utils";
import { isAbsoluteHistoricalMin } from "@/lib/product-insights";

export type OpportunitySeal = {
  emoji: string;
  label: string;
  className: string;
  kind: DecisionUiKind;
  /** Só true quando o mínimo histórico é realmente excepcional. */
  showHistoricalMin: boolean;
};

/** Selo de decisão — mínimo histórico raro, nunca wallpaper. */
export function getOpportunitySeal(product: Product): OpportunitySeal {
  const showHistoricalMin =
    Boolean(product.decision.isHistoricalMin) &&
    isAbsoluteHistoricalMin(product.currentPrice, product.historicalMin) &&
    product.decision.semaphore === "buy";

  if (product.decision.semaphore === "buy") {
    return {
      emoji: "🟢",
      label: "Vale a pena comprar",
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
      kind: "buy",
      showHistoricalMin,
    };
  }
  if (product.decision.semaphore === "fair") {
    return {
      emoji: "🟡",
      label: "Ainda não sabemos",
      className: "border-yellow-200 bg-yellow-50 text-yellow-800",
      kind: "fair",
      showHistoricalMin: false,
    };
  }
  return {
    emoji: "🟠",
    label: "Melhor esperar",
    className: "border-orange-200 bg-orange-50 text-orange-800",
    kind: "wait",
    showHistoricalMin: false,
  };
}

/** Uma frase de motivo para cards da homepage — sem jargão. */
export function buildDecisionReason(product: Product): string {
  const current = product.currentPrice;
  const avg = product.referencePrice ?? product.avg30d;
  const histMin = product.historicalMin;
  const disc =
    product.realDiscountPct != null
      ? product.realDiscountPct
      : product.decision.discountPct;

  if (product.decision.semaphore === "buy") {
    if (disc != null && disc >= 1 && avg != null && avg > current) {
      return `Este preço está ${formatPct(disc)} abaixo da referência observada (${formatEUR(avg)}).`;
    }
    if (histMin > 0 && current <= histMin * 1.02) {
      return `Está perto do menor preço que observámos (${formatEUR(histMin)}).`;
    }
    const summary = (product.decision.lymiarIndex.summary || product.decision.reason || "").trim();
    if (summary && !/score|índice|index|deal/i.test(summary)) {
      return summary.length > 140 ? `${summary.slice(0, 137)}…` : summary;
    }
    return "O preço actual está favorável face ao histórico observado.";
  }

  if (product.decision.semaphore === "wait") {
    if (avg != null && avg > 0 && current > avg) {
      const pct = ((current - avg) / avg) * 100;
      return `Está cerca de ${pct.toFixed(0).replace(".", ",")}% acima do valor habitual (${formatEUR(avg)}).`;
    }
    if (histMin > 0 && current > histMin * 1.05) {
      return `Já vimos este produto por ${formatEUR(histMin)}. Pode valer a pena esperar.`;
    }
    return "O preço actual está acima do que costumamos observar.";
  }

  return "O preço parece alinhado com o que temos observado.";
}
