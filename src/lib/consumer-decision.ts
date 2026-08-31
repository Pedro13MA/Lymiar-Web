/**
 * ConsumerDecision — veredicto canónico do Hub (BUY | WAIT | UNKNOWN).
 * Web só lê; não recalcula regras de negócio.
 */

import type { Product } from "@/lib/types";

export type ConsumerVerdict = "BUY" | "WAIT" | "UNKNOWN";

export type ConsumerDecisionEvidence = {
  current_price?: number | null;
  historical_min?: number | null;
  historical_max?: number | null;
  sample_days?: number;
  span_days?: number;
  eligible_observations?: number;
  stale_hours?: number | null;
};

export type ConsumerDecision = {
  verdict: ConsumerVerdict;
  confidence: number;
  reason: string;
  evidence?: ConsumerDecisionEvidence | null;
  policy_version?: string;
};

const REASON_LABELS: Record<string, string> = {
  INSUFFICIENT_SAMPLE: "Ainda não temos evidências suficientes para um veredicto firme.",
  INSUFFICIENT_SAMPLE_FOR_BUY: "Ainda não temos evidências suficientes para recomendar compra.",
  INDEX_NOT_CONSUMER_VERDICT: "O índice editorial não substitui o veredicto ao comprador.",
  INDEX_BAND_ELEVATED: "O índice sugere preço elevado face ao histórico.",
  INSUFFICIENT_EVIDENCE: "Ainda não temos evidências suficientes para um veredicto firme.",
  PRICE_NEAR_HISTORICAL_MIN: "O preço actual corresponde ao mínimo observado.",
  PRICE_BELOW_AVERAGE_RANGE: "O preço encontra-se abaixo da faixa habitual observada.",
  PRICE_ELEVATED_VS_HISTORY: "O preço está elevado face ao histórico observado.",
  PRICE_UNCLEAR_MONITOR: "O preço ainda não apresenta um sinal claro — vale monitorizar.",
  LEGACY_RECOMMENDATION: "Leitura com base nos dados observados.",
};

export function resolveConsumerDecision(product: Product): ConsumerDecision | null {
  const cd = product.consumerDecision;
  if (!cd?.verdict) return null;
  return cd;
}

export function consumerVerdictTone(
  verdict: ConsumerVerdict,
): "buy" | "wait" | "unknown" {
  if (verdict === "BUY") return "buy";
  if (verdict === "WAIT") return "wait";
  return "unknown";
}

export function consumerVerdictBadge(verdict: ConsumerVerdict): string {
  if (verdict === "BUY") return "Vale a pena comprar";
  if (verdict === "WAIT") return "Espera mais um pouco";
  return "Ainda não sabemos";
}

export function consumerVerdictTitle(verdict: ConsumerVerdict): string {
  if (verdict === "BUY") return "Vale a pena comprar";
  if (verdict === "WAIT") return "Recomendamos esperar";
  return "O Lymiar ainda está a observar este produto";
}

export function humanConsumerReason(reason: string | null | undefined): string {
  const key = String(reason || "").trim().toUpperCase();
  if (REASON_LABELS[key]) return REASON_LABELS[key];
  if (key.startsWith("LYMIAR_INDEX_")) {
    const sem = key.replace("LYMIAR_INDEX_", "").toLowerCase();
    if (sem === "buy" || sem === "fair") {
      return "O índice Lymiar indica um momento favorável face ao histórico.";
    }
    if (sem === "wait") {
      return "O índice Lymiar sugere esperar antes de comprar.";
    }
  }
  const raw = String(reason || "").trim();
  return raw || "Com base no histórico observado.";
}

/** Confiança 0–100 para UI (API envia 0–1). */
export function consumerVerdictShortLabel(verdict: ConsumerVerdict): string {
  if (verdict === "BUY") return "Bom preço";
  if (verdict === "WAIT") return "Preço elevado";
  return "Poucos dados";
}

export function resolveConsumerInsightLabel(product: Product): string | null {
  const cd = resolveConsumerDecision(product);
  if (!cd) return null;
  return consumerVerdictShortLabel(cd.verdict);
}

/** Confiança 0–100 para UI (API envia 0–1). */
export function consumerConfidencePct(cd: ConsumerDecision): number {
  const raw = cd.confidence;
  if (!Number.isFinite(raw)) return 0;
  if (raw <= 1) return Math.round(raw * 100);
  return Math.round(Math.min(100, raw));
}

export function buildVerdictFromConsumerDecision(
  product: Product,
  opts: {
    spanDays: number;
    storeCount: number;
    observations: number;
    bestStoreLabel: string | null;
  },
): { title: string; lines: string[] } | null {
  const cd = resolveConsumerDecision(product);
  if (!cd) return null;

  const { spanDays, storeCount, observations, bestStoreLabel } = opts;
  const spanLabel =
    spanDays <= 0
      ? "ainda sem série de preços suficiente"
      : spanDays === 1
        ? "há 1 dia"
        : `há ${spanDays} dias`;

  const lines: string[] = [humanConsumerReason(cd.reason)];

  if (spanDays > 0) {
    lines.push(`O Lymiar acompanha este produto ${spanLabel}.`);
  }
  if (storeCount > 0) {
    lines.push(
      `Neste momento existem ${storeCount} loja${storeCount === 1 ? "" : "s"} com oferta.`,
    );
  }
  if (observations > 0 && cd.verdict === "UNKNOWN") {
    lines.push(
      `Com ${observations} observação${observations === 1 ? "" : "ões"} ainda não há base para recomendar.`,
    );
  }
  if (bestStoreLabel && cd.verdict === "BUY") {
    lines.push(`A ${bestStoreLabel} apresenta actualmente o melhor preço.`);
  }
  if (bestStoreLabel && cd.verdict === "WAIT") {
    lines.push(
      `Se fores comprar agora, a ${bestStoreLabel} tem o melhor preço observado.`,
    );
  }

  return {
    title: consumerVerdictTitle(cd.verdict),
    lines,
  };
}
