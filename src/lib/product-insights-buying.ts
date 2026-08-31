/**
 * FASE 7.16 — Product Insights (cliente).
 * Interpretação factual dos dados já carregados. Sem IA / sem previsões.
 * Prefere `product.insights` da API; fallback local só sem Hub (legado Fase 8).
 * Veredicto comprador: sempre `product.consumerDecision` da API.
 */

import type { Product } from "@/lib/types";
import { resolveConsumerInsightLabel } from "@/lib/consumer-decision";

export type InsightRecommendation =
  | "BUY_NOW"
  | "GOOD_PRICE"
  | "WAIT"
  | "WATCH"
  | "INSUFFICIENT_DATA";

export type InsightTone = "good" | "neutral" | "caution";

export type InsightCard = {
  id: string;
  tone: InsightTone;
  label: string;
};

export type InsightTimelineEvent = {
  id: string;
  date: string;
  label: string;
  detail: string;
};

export type ProductInsights = {
  bestStore?: string | null;
  lowestHistorical?: number | null;
  highestHistorical?: number | null;
  currentPrice?: number | null;
  currentPosition: string;
  currentPositionLabel: string;
  priceTrend: string;
  priceTrendLabel: string;
  availability: string;
  availabilityLabel: string;
  priceVolatility: string;
  priceVolatilityLabel: string;
  competition?: string;
  couponStatus?: string;
  historyStatus?: string;
  recommendation: InsightRecommendation;
  recommendationLabel: string;
  confidence: number;
  dataQuality: number;
  evidence?: {
    historyPoints?: number;
    spanDays?: number;
    storeCount?: number;
    knowledgeCompleteness?: number | null;
  };
  cards: InsightCard[];
  summary: string[];
  pros: string[];
  cons: string[];
  timeline: InsightTimelineEvent[];
  atNewMinimum?: boolean;
  atNewMaximum?: boolean;
};

const REC_LABEL: Record<InsightRecommendation, string> = {
  BUY_NOW: "Comprar agora",
  GOOD_PRICE: "Bom preço",
  WAIT: "Esperar",
  WATCH: "Monitorizar",
  INSUFFICIENT_DATA: "Dados insuficientes",
};

const POSITION_LABEL: Record<string, string> = {
  near_minimum: "Muito próximo do mínimo histórico",
  close_to_minimum: "Perto do mínimo histórico",
  average: "Preço na média observada",
  elevated: "Preço elevado face ao histórico",
  far_above: "Muito acima do histórico",
  insufficient: "Histórico insuficiente para situar o preço",
};

function spanDays(history: Array<{ date: string; price: number }>): number {
  if (history.length < 2) return 0;
  const a = Date.parse(history[0].date);
  const b = Date.parse(history[history.length - 1].date);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return history.length - 1;
  return Math.max(0, Math.round((b - a) / 86400000));
}

function cvPct(prices: number[]): number | null {
  if (prices.length < 3) return null;
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  if (mean <= 0) return null;
  const var_ =
    prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length;
  return (Math.sqrt(var_) / mean) * 100;
}

/** Computação local (espelha hub) — só dados do produto. */
/** @deprecated Fase 8 — usar API `insights` + `consumerDecision`; fallback offline only */
export function computeProductInsights(product: Product): ProductInsights {
  const history = [...(product.history || [])]
    .filter((h) => h.price > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const prices = history.map((h) => h.price);
  const cur = product.currentPrice > 0 ? product.currentPrice : null;
  let hmin =
    product.historicalMin > 0
      ? product.historicalMin
      : prices.length
        ? Math.min(...prices)
        : null;
  let hmax =
    product.historicalMax > 0
      ? product.historicalMax
      : prices.length
        ? Math.max(...prices)
        : null;
  const avg =
    product.avg30d > 0
      ? product.avg30d
      : prices.length
        ? prices.reduce((s, p) => s + p, 0) / prices.length
        : null;

  const n = history.length;
  const span = spanDays(history);
  const stores = new Set(
    (product.offers || [])
      .map((o) => (o.slug || o.store || "").toLowerCase())
      .filter(Boolean),
  ).size;
  const offerPrices = (product.offers || [])
    .map((o) => o.price)
    .filter((p) => p > 0);
  const hasCoupon = Boolean(
    product.activeCoupon || product.storeCouponsAvailable,
  );
  const kc =
    typeof product.knowledgeCompleteness === "number"
      ? product.knowledgeCompleteness
      : typeof product.knowledge?.completeness === "number"
        ? product.knowledge.completeness
        : 0;

  let position = "insufficient";
  if (cur != null && hmin != null && n >= 3 && hmin > 0) {
    const pct = ((cur - hmin) / hmin) * 100;
    if (pct <= 2) position = "near_minimum";
    else if (pct <= 5) position = "close_to_minimum";
    else if (avg != null && Math.abs(cur - avg) / avg <= 0.05)
      position = "average";
    else if (pct >= 20 || (hmax != null && cur >= hmax * 0.95))
      position = "far_above";
    else if (avg != null && cur > avg * 1.08) position = "elevated";
    else position = "average";
  }

  const atNewMin = Boolean(
    product.decision?.isHistoricalMin ||
      (cur != null && hmin != null && cur <= hmin * 1.005 && n >= 3),
  );

  let trend = "insufficient";
  if (n >= 4) {
    const window = prices.slice(-Math.min(14, n));
    const first = window[0];
    const last = window[window.length - 1];
    const delta = ((last - first) / first) * 100;
    if (delta <= -3) trend = "falling";
    else if (delta >= 3) trend = "rising";
    else trend = "stable";
  } else if (n >= 2) {
    const delta = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
    if (Math.abs(delta) < 3) trend = "stable";
    else trend = delta < 0 ? "falling" : "rising";
  }

  const cv = cvPct(prices);
  const volatility =
    cv == null ? "insufficient" : cv < 5 ? "low" : cv < 12 ? "medium" : "high";

  const availability =
    stores >= 4 ? "many" : stores >= 2 ? "medium" : stores === 1 ? "one" : "none";

  let competition = "insufficient";
  if (offerPrices.length >= 2) {
    const lo = Math.min(...offerPrices);
    const hi = Math.max(...offerPrices);
    const spread = lo > 0 ? ((hi - lo) / lo) * 100 : 0;
    if (spread <= 3) competition = "similar";
    else if (spread >= 10) competition = "large_spread";
    else competition = "moderate_spread";
  } else if (offerPrices.length === 1) competition = "single_store";

  let conf = 0;
  conf += Math.min(40, n * 4);
  conf += Math.min(25, stores * 8);
  conf += Math.min(25, Math.floor(span / 7) * 3);
  conf += Math.min(10, Math.floor(kc / 10));
  if (n < 3) conf = Math.min(conf, 35);
  const confidence = Math.max(0, Math.min(100, conf));

  let recommendation: InsightRecommendation = "WATCH";
  if (n < 5 || position === "insufficient" || confidence < 40) {
    recommendation = "INSUFFICIENT_DATA";
  } else if (
    position === "near_minimum" &&
    (trend === "stable" || trend === "falling") &&
    volatility !== "high"
  ) {
    recommendation = "BUY_NOW";
  } else if (
    (position === "near_minimum" || position === "close_to_minimum") &&
    trend !== "rising"
  ) {
    recommendation = "GOOD_PRICE";
  } else if (position === "elevated" || position === "far_above") {
    recommendation = "WAIT";
  }

  let dq = 0;
  if (n >= 30) dq += 2;
  else if (n >= 10) dq += 1;
  if (span >= 90) dq += 1;
  else if (span >= 30) dq += 0.5;
  if (stores >= 3) dq += 1;
  else if (stores >= 2) dq += 0.5;
  if (kc >= 60) dq += 1;
  else if (kc >= 30) dq += 0.5;
  const dataQuality = Math.max(1, Math.min(5, Math.round(dq) || 1));

  const trendLabel: Record<string, string> = {
    rising: "Tendência de subida no período observado",
    falling: "Tendência de descida no período observado",
    stable: "Tendência estável no período observado",
    insufficient: "Poucos dados para avaliar a tendência",
  };
  const volLabel: Record<string, string> = {
    low: "Baixa volatilidade",
    medium: "Volatilidade média",
    high: "Alta volatilidade",
    insufficient: "Volatilidade indeterminada (poucos dados)",
  };
  const availLabel: Record<string, string> = {
    many: "Muitas lojas com disponibilidade",
    medium: "Disponibilidade moderada entre lojas",
    one: "Apenas uma loja com disponibilidade",
    none: "Sem lojas com preço observado",
  };

  const cards: InsightCard[] = [
    {
      id: "position",
      tone:
        position === "near_minimum" || position === "close_to_minimum"
          ? "good"
          : position === "elevated" ||
              position === "far_above" ||
              position === "insufficient"
            ? "caution"
            : "neutral",
      label: POSITION_LABEL[position] || position,
    },
    {
      id: "trend",
      tone:
        trend === "stable" || trend === "falling"
          ? "good"
          : trend === "rising"
            ? "caution"
            : "neutral",
      label: trendLabel[trend],
    },
    {
      id: "availability",
      tone:
        availability === "many"
          ? "good"
          : availability === "one" || availability === "none"
            ? "caution"
            : "neutral",
      label: availLabel[availability],
    },
    {
      id: "volatility",
      tone:
        volatility === "low"
          ? "good"
          : volatility === "high"
            ? "caution"
            : "neutral",
      label: volLabel[volatility],
    },
  ];
  if (n < 10 || span < 30) {
    cards.push({
      id: "history_depth",
      tone: "caution",
      label: "Dados históricos limitados",
    });
  }
  if (hasCoupon) {
    cards.push({
      id: "coupon",
      tone: "neutral",
      label: "Existe cupão associado à loja",
    });
  }

  const summary: string[] = [];
  if (position === "near_minimum")
    summary.push(
      "Este produto encontra-se muito próximo do menor preço observado.",
    );
  else if (position === "close_to_minimum")
    summary.push("O preço actual está perto do mínimo observado.");
  else if (position === "average")
    summary.push("O preço actual situa-se na média do histórico observado.");
  else if (position === "elevated")
    summary.push("O preço actual está elevado face ao histórico observado.");
  else if (position === "far_above")
    summary.push("O preço actual está muito acima do histórico observado.");
  else
    summary.push(
      "Ainda não existem evidências suficientes para situar o preço no tempo.",
    );
  if (trend === "stable")
    summary.push("O preço mantém-se estável no período observado.");
  else if (trend === "falling")
    summary.push("No período observado, o preço desceu.");
  else if (trend === "rising")
    summary.push("No período observado, o preço subiu.");
  if (availability === "one")
    summary.push("Existe apenas uma loja com disponibilidade.");
  else if (availability === "many")
    summary.push("Há várias lojas com disponibilidade.");
  if (competition === "large_spread")
    summary.push("Há diferenças significativas entre lojas.");
  if (recommendation === "INSUFFICIENT_DATA")
    summary.push("Não existem evidências suficientes para um veredicto firme.");

  const pros: string[] = [];
  const cons: string[] = [];
  if (position === "near_minimum" || position === "close_to_minimum")
    pros.push("Preço próximo do mínimo observado");
  if (availability === "many") pros.push("Boa disponibilidade entre lojas");
  if (volatility === "low") pros.push("Baixa volatilidade no histórico observado");
  if (hasCoupon) pros.push("Cupão disponível na loja (informativo)");
  if (n < 10) cons.push("Pouco histórico observado");
  if (stores <= 1) cons.push("Poucas lojas com preço");
  if (position === "elevated" || position === "far_above")
    cons.push("Preço acima do habitual observado");
  if (availability === "one") cons.push("Apenas uma loja disponível");

  const timeline: InsightTimelineEvent[] = [];
  if (!history.length) {
    timeline.push({
      id: "today",
      date: new Date().toISOString().slice(0, 10),
      label: "Hoje",
      detail: "Sem histórico de preços observado",
    });
  } else {
    timeline.push({
      id: "history_start",
      date: history[0].date,
      label: "Histórico iniciado",
      detail: `Primeiro preço observado: ${history[0].price.toFixed(2)} €`,
    });
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1].price;
      const price = history[i].price;
      if (prev > 0 && (prev - price) / prev >= 0.05) {
        timeline.push({
          id: "first_drop",
          date: history[i].date,
          label: "Primeira descida relevante",
          detail: `Queda observada para ${price.toFixed(2)} €`,
        });
        break;
      }
    }
    const last = history[history.length - 1];
    timeline.push({
      id: "current_price",
      date: last.date,
      label: "Preço actual",
      detail: `${(cur ?? last.price).toFixed(2)} €`,
    });
    if (atNewMin && hmin != null) {
      timeline.push({
        id: "new_min",
        date: last.date,
        label: "Novo mínimo observado",
        detail: `${hmin.toFixed(2)} €`,
      });
    }
    timeline.push({
      id: "today",
      date: new Date().toISOString().slice(0, 10),
      label: "Hoje",
      detail: "Leitura Lymiar com base nos dados observados",
    });
  }

  const best =
    [...(product.offers || [])].sort((a, b) => a.price - b.price)[0] || null;

  return {
    bestStore: best?.storeName || best?.store || null,
    lowestHistorical: hmin,
    highestHistorical: hmax,
    currentPrice: cur,
    currentPosition: position,
    currentPositionLabel: POSITION_LABEL[position],
    priceTrend: trend,
    priceTrendLabel: trendLabel[trend],
    availability,
    availabilityLabel: availLabel[availability],
    priceVolatility: volatility,
    priceVolatilityLabel: volLabel[volatility],
    competition,
    couponStatus: hasCoupon ? "with_coupon" : "no_coupon",
    recommendation,
    recommendationLabel: REC_LABEL[recommendation],
    confidence,
    dataQuality,
    evidence: {
      historyPoints: n,
      spanDays: span,
      storeCount: stores,
      knowledgeCompleteness: kc || null,
    },
    cards,
    summary: summary.slice(0, 4),
    pros,
    cons,
    timeline,
    atNewMinimum: atNewMin,
  };
}

export function resolveProductInsights(product: Product): ProductInsights {
  const api = product.insights;
  if (api && api.recommendation && Array.isArray(api.cards) && api.cards.length) {
    return {
      ...api,
      recommendation: api.recommendation as InsightRecommendation,
      recommendationLabel:
        api.recommendationLabel ||
        REC_LABEL[api.recommendation as InsightRecommendation] ||
        api.recommendation,
      confidence:
        typeof product.recommendationConfidence === "number"
          ? product.recommendationConfidence
          : typeof api.confidence === "number"
            ? api.confidence
            : 0,
      cards: api.cards as InsightCard[],
      summary: api.summary || [],
      pros: api.pros || [],
      cons: api.cons || [],
      timeline: (api.timeline || []) as InsightTimelineEvent[],
      currentPosition: api.currentPosition || "insufficient",
      currentPositionLabel:
        api.currentPositionLabel ||
        POSITION_LABEL[api.currentPosition || ""] ||
        "",
      priceTrend: api.priceTrend || "insufficient",
      priceTrendLabel: api.priceTrendLabel || "",
      availability: api.availability || "none",
      availabilityLabel: api.availabilityLabel || "",
      priceVolatility: api.priceVolatility || "insufficient",
      priceVolatilityLabel: api.priceVolatilityLabel || "",
      dataQuality: api.dataQuality || 1,
    };
  }
  return computeProductInsights(product);
}

export function recommendationShortLabel(
  rec: InsightRecommendation | string | null | undefined,
): string {
  if (!rec) return "—";
  return REC_LABEL[rec as InsightRecommendation] || String(rec);
}

/** Rótulo curto para projetos / cart (factual). */
export function priceInsightShort(product: Product): string {
  const fromConsumer = resolveConsumerInsightLabel(product);
  if (fromConsumer) return fromConsumer;
  const i = resolveProductInsights(product);
  if (i.recommendation === "INSUFFICIENT_DATA") return "Poucos dados";
  if (
    i.currentPosition === "near_minimum" ||
    i.currentPosition === "close_to_minimum"
  )
    return "Bom preço";
  if (i.currentPosition === "average") return "Preço médio";
  if (
    i.currentPosition === "elevated" ||
    i.currentPosition === "far_above"
  )
    return "Preço elevado";
  return "Poucos dados";
}
