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
  price_change_count?: number;
  buyable_stores?: number;
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
  NO_BUYABLE_OFFER: "Nenhuma loja com stock confirmado — não recomendamos compra agora.",
  STALE_OBSERVATION: "A última observação é antiga — aguardamos dados mais recentes.",
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

export type PdpVerdictContext = {
  spanDays?: number;
  eligibleObservations?: number | null;
  reason?: string;
};

/** Badge PDP — distingue radar longo vs produto novo. */
export function consumerVerdictBadgeForPdp(
  verdict: ConsumerVerdict,
  ctx?: PdpVerdictContext,
): string {
  if (verdict === "BUY") return "Vale a pena comprar";
  if (verdict === "WAIT") return "Espera mais um pouco";
  const span = ctx?.spanDays ?? 0;
  const reason = String(ctx?.reason || "").toUpperCase();
  if (reason === "PRICE_UNCLEAR_MONITOR" && span >= 14) return "Sem sinal firme";
  const eligible = ctx?.eligibleObservations;
  if (span >= 14 && eligible != null && eligible < 5) {
    return "Sem sinal firme";
  }
  if (span < 7) return "Ainda não sabemos";
  return "Sem recomendação firme";
}

export function consumerVerdictTitle(verdict: ConsumerVerdict): string {
  if (verdict === "BUY") return "Vale a pena comprar";
  if (verdict === "WAIT") return "Recomendamos esperar";
  return "O Lymiar ainda está a observar este produto";
}

/** Título PDP — não trata 33 dias como “produto novo”. */
export function consumerVerdictTitleForPdp(
  verdict: ConsumerVerdict,
  ctx?: PdpVerdictContext,
): string {
  if (verdict === "BUY") return "Vale a pena comprar";
  if (verdict === "WAIT") return "Recomendamos esperar";
  const span = ctx?.spanDays ?? 0;
  const eligible = ctx?.eligibleObservations;
  const reason = String(ctx?.reason || "").toUpperCase();
  if (reason === "PRICE_UNCLEAR_MONITOR" && span >= 14) {
    return "Preço na média — sem sinal claro de compra ou espera";
  }
  if (reason === "NO_BUYABLE_OFFER") {
    return "Sem stock confirmado nas lojas observadas";
  }
  if (
    reason === "INSUFFICIENT_SAMPLE" &&
    span >= 28 &&
    eligible != null &&
    eligible < 5
  ) {
    return "Um mês de radar — o preço ainda não deu sinal claro";
  }
  if (
    reason === "INSUFFICIENT_SAMPLE" &&
    span >= 14 &&
    eligible != null &&
    eligible < 5
  ) {
    return "Já há histórico — faltam mudanças de preço para recomendar";
  }
  if (span < 7) return "O Lymiar ainda está a observar este produto";
  return "Ainda não temos um veredicto firme";
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

/** Primeira linha do veredicto PDP — separa dias no gráfico vs mudanças confirmadas. */
export function humanConsumerReasonForPdp(
  reason: string | null | undefined,
  opts: { spanDays: number; eligibleObservations?: number | null },
): string {
  const key = String(reason || "").trim().toUpperCase();
  const eligible = opts.eligibleObservations;
  if (key === "INSUFFICIENT_SAMPLE" && opts.spanDays >= 28) {
    return "Há cerca de um mês no radar, mas só contamos mudanças reais de preço — e ainda são poucas para recomendar compra ou espera com firmeza.";
  }
  if (
    key === "INSUFFICIENT_SAMPLE" &&
    opts.spanDays >= 14 &&
    eligible != null &&
    eligible < 5
  ) {
    return `Já acompanhamos ${opts.spanDays} dias, mas só ${eligible} ${eligible === 1 ? "mudança" : "mudanças"} de preço confirmadas — insuficiente para um veredicto firme.`;
  }
  if (key === "PRICE_UNCLEAR_MONITOR" && opts.spanDays >= 14) {
    return "O preço oscilou, mas ainda não apresenta um padrão claro que permita recomendar compra ou espera.";
  }
  return humanConsumerReason(reason);
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

export type PdpEvidenceFootnote = {
  spanDays: number;
  listedStoreCount: number;
  buyableStoreCount: number;
  chartPointCount: number;
  eligibleObservations?: number | null;
  priceChangeCount?: number | null;
};

/** Linha de contexto honesta — separa gráfico, stock e amostra do veredicto. */
export function formatPdpEvidenceFootnote(opts: PdpEvidenceFootnote): string {
  const parts: string[] = [];
  if (opts.spanDays > 0) {
    parts.push(
      opts.spanDays === 1
        ? "1 dia no gráfico"
        : `${opts.spanDays} dias no gráfico`,
    );
  }
  if (opts.buyableStoreCount > 0) {
    parts.push(
      opts.buyableStoreCount === 1
        ? "1 loja disponível"
        : `${opts.buyableStoreCount} lojas disponíveis`,
    );
  } else if (opts.listedStoreCount > 0) {
    parts.push(
      `${opts.listedStoreCount} loja${opts.listedStoreCount === 1 ? "" : "s"} listadas (sem stock confirmado)`,
    );
  }
  const eligible = opts.eligibleObservations;
  const changes = opts.priceChangeCount;
  if (changes != null && changes > 0) {
    parts.push(
      changes === 1
        ? "1 mudança de preço no veredicto"
        : `${changes} mudanças de preço no veredicto`,
    );
  } else if (eligible != null && eligible > 0) {
    parts.push(
      eligible === 1
        ? "1 mudança de preço no veredicto"
        : `${eligible} mudanças de preço no veredicto`,
    );
  } else if (opts.chartPointCount > 0) {
    parts.push(
      opts.chartPointCount === 1
        ? "1 ponto no histórico"
        : `${opts.chartPointCount} pontos no histórico`,
    );
  }
  return parts.join(" · ");
}

export function buildVerdictFromConsumerDecision(
  product: Product,
  opts: {
    spanDays: number;
    storeCount: number;
    buyableStoreCount: number;
    observations: number;
    eligibleObservations?: number | null;
    bestStoreLabel: string | null;
    bestStoreBuyable?: boolean;
  },
): { title: string; lines: string[] } | null {
  const cd = resolveConsumerDecision(product);
  if (!cd) return null;

  const {
    spanDays,
    storeCount,
    buyableStoreCount,
    observations,
    eligibleObservations,
    bestStoreLabel,
    bestStoreBuyable = true,
  } = opts;
  const spanLabel =
    spanDays <= 0
      ? "ainda sem série de preços suficiente"
      : spanDays === 1
        ? "há 1 dia"
        : `há ${spanDays} dias`;

  const eligible =
    eligibleObservations ?? cd.evidence?.eligible_observations ?? null;

  const pdpCtx: PdpVerdictContext = {
    spanDays,
    eligibleObservations: eligible,
    reason: cd.reason,
  };

  const lines: string[] = [
    humanConsumerReasonForPdp(cd.reason, {
      spanDays,
      eligibleObservations: eligible,
    }),
  ];

  if (spanDays > 0) {
    lines.push(`O Lymiar acompanha este produto ${spanLabel}.`);
  }

  if (buyableStoreCount > 0) {
    lines.push(
      buyableStoreCount === 1
        ? "Neste momento há 1 loja onde podes comprar."
        : `Neste momento há ${buyableStoreCount} lojas onde podes comprar.`,
    );
  } else if (storeCount > 0) {
    lines.push(
      "As lojas listadas estão esgotadas ou sem stock confirmado — consulta cada loja.",
    );
  }

  if (
    cd.verdict === "UNKNOWN" &&
    eligible != null &&
    eligible > 0 &&
    eligible < 5 &&
    spanDays >= 14
  ) {
    lines.push(
      "O gráfico mostra o calendário completo; o veredicto só usa dias em que o preço mudou de forma confirmada.",
    );
  } else if (cd.verdict === "UNKNOWN" && observations > 0 && spanDays < 14) {
    lines.push(
      `Com ${observations} ${observations === 1 ? "observação" : "observações"} ainda não há base para recomendar.`,
    );
  }

  if (bestStoreLabel && cd.verdict === "BUY") {
    if (bestStoreBuyable) {
      lines.push(`A ${bestStoreLabel} apresenta actualmente o melhor preço disponível.`);
    } else {
      lines.push(
        `O menor preço listado (${bestStoreLabel}) está esgotado — verifica as lojas disponíveis abaixo.`,
      );
    }
  }
  if (bestStoreLabel && cd.verdict === "WAIT" && bestStoreBuyable) {
    lines.push(
      `Se fores comprar agora, a ${bestStoreLabel} tem o melhor preço observado.`,
    );
  }

  return {
    title: consumerVerdictTitleForPdp(cd.verdict, pdpCtx),
    lines,
  };
}
