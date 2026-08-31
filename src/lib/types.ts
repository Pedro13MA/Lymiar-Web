/** Types aligned with Lymiar backend (Python/SQLite) + web decision UI. */

export type DealTier = "S" | "A" | "B";

export type DealQuality =
  | "VERY_GOOD_DEAL"
  | "GOOD_DEAL"
  | "FAIR_DEAL"
  | "NORMAL";

// Tipos alinhados com eventos observados no frontend (inclui PRICE_DROP usado em testes).
export type OpportunityType =
  | "NEW_LOW"
  | "RETURNED_DEAL"
  | "NOISE"
  | "PRICE_DROP";

/** UI semaphore mapped from opportunity + deal quality. */
export type DecisionSemaphore = "buy" | "fair" | "wait";

export type DiscountKind = "percent" | "amount" | "unknown";

/** Condição do produto (isolamento ATL: outlet ≠ new). */
export type ProductCondition = "NEW" | "OUTLET" | "REFURBISHED" | "OPEN_BOX";

export interface PaymentMethod {
  id: string;
  label: string;
  icon?: string;
}

export interface ShippingInfo {
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  shippingCost?: string;
  supportsPickup?: boolean;
}

export type StockStatus = "in_stock" | "out_of_stock" | "unknown";

export interface Offer {
  store: string;
  storeName: string;
  /** Slug canónico da loja (igual a `store` quando a API o envia). */
  slug?: string;
  logoUrl?: string | null;
  url: string;
  price: number;
  currency?: string;
  originalPrice?: number | null;
  /** Preço após cupão aplicável (se menor que price). */
  effectivePrice?: number | null;
  inStock?: boolean | null;
  stockStatus?: StockStatus | null;
  couponCode?: string | null;
  couponLabel?: string | null;
  paymentMethods?: PaymentMethod[];
  /** Resumo legível (ex: "2–5 dias"). */
  shippingInfo?: string;
  /** Detalhe estruturado de entrega (API). */
  shippingDetails?: ShippingInfo | null;
  /** Campanha de carrinho estratégica nesta loja. */
  smartBasketOpportunity?: boolean;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface Promotion {
  externalId: string;
  merchantId: string;
  storeName: string;
  storeSlug: string;
  title?: string | null;
  /** Ref interna Awin (ex: "DSI | Julho 2026") quando o título é a descrição comercial. */
  campaignRef?: string | null;
  description?: string | null;
  /** Termos e condições Awin (texto completo). */
  terms?: string | null;
  conditions?: string | null;
  code?: string | null;
  url: string;
  promotionType?: string;
  discountKind?: DiscountKind;
  discountValue?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  logoUrl?: string | null;
}

export interface SmartCoupon {
  storeCode: string;
  storeName?: string | null;
  code: string;
  discountPct?: number | null;
  discountKind?: DiscountKind | string;
  discountAmount?: number | null;
  discountValue?: number | null;
  appliesTo?: string;
  category?: string | null;
  title?: string | null;
  /** Ref interna Awin (ex: "DSI | Julho 2026") quando o título é a descrição comercial. */
  campaignRef?: string | null;
  description?: string | null;
  descriptionFull?: string | null;
  terms?: string | null;
  conditions?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  status?: string | null;
  /** Página oficial da campanha (Awin), se existir. */
  url?: string | null;
}

export interface StoreCampaign {
  storeCode: string;
  title: string;
  description?: string | null;
  rulesSummary?: string | null;
  appliesTo?: string;
  category?: string | null;
  couponCode?: string | null;
  affiliateUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  requiresCode?: boolean;
  minSpendEur?: number | null;
  discountPct?: number | null;
  brands?: string[] | null;
  maxGapEur?: number | null;
}

export interface SmartBasketOpportunity {
  smartBasketOpportunity: boolean;
  amountNeededEur: number;
  potentialTotalEur: number;
  competitorMinPrice: number;
  savingsEur: number;
  discountPct: number;
  minSpendEur: number;
  storeCode: string;
  storeName?: string | null;
  campaignTitle?: string | null;
  brands?: string[];
}

export interface ScoreBreakdown {
  baseQuality: number;
  priceOpportunity: number;
  trend: number;
  rarity: number;
  categoryOverload: number;
  storeDominance: number;
  feedbackAdjustment: number;
}

/** Fatores factuais do Índice Lymiar (0–100). */
export interface LymiarIndexFactors {
  vsAvg30d: {
    score: number;
    label: string;
    detail: string;
  };
  historicalMin: {
    score: number;
    label: string;
    detail: string;
  };
  couponApplied: {
    score: number;
    label: string;
    detail: string;
  };
  volatility: {
    score: number;
    label: string;
    detail: string;
  };
}

export interface LymiarIndex {
  /** Score 0–100. */
  value: number;
  summary: string;
  factors: LymiarIndexFactors;
}

export interface SeasonalMarker {
  month: number; // 1–12
  label: string;
  kind: "promo" | "peak" | "neutral";
}

export interface Seasonality {
  markers: SeasonalMarker[];
  note: string;
  timesBelowCurrent12m: number;
}

export interface DecisionScore {
  finalScore: number;
  publish: boolean;
  tier: DealTier;
  reason: string;
  breakdown: ScoreBreakdown;
  discountPct: number;
  zScore?: number | null;
  dealQuality: DealQuality;
  opportunityType: OpportunityType;
  historicalAvg?: number | null;
  historicalMin?: number | null;
  isHistoricalMin: boolean;
  cheapestStore?: string | null;
  feedCategory: string;
  /** Justificações factuais (sem previsões). */
  bullets: string[];
  semaphore: DecisionSemaphore;
  lymiarIndex: LymiarIndex;
}

export interface Product {
  slug: string;
  ean: string;
  name: string;
  brand?: string | null;
  category: string;
  /** Chave de subcategoria do catálogo (gpu, laptop, …) quando disponível. */
  subcategory?: string | null;
  subcategoryLabel?: string | null;
  imageUrl?: string | null;
  currency?: string;
  currentPrice: number;
  avg30d: number;
  historicalMin: number;
  historicalMax: number;
  /** Queda percentual face a ontem (quando observável). */
  dropTodayPct?: number;
  history: PricePoint[];
  offers: Offer[];
  decision: DecisionScore;
  seasonality: Seasonality;
  activePromotion?: Promotion | null;
  /** Cupão inteligente aplicável a este produto (motor de campanhas). */
  activeCoupon?: SmartCoupon | null;
  /** Campanha de loja em vigor (banner). */
  activeCampaign?: StoreCampaign | null;
  /** Oportunidade de carrinho estratégico (abaixo do min_spend). */
  smartBasketOpportunity?: SmartBasketOpportunity | null;
  /** Preço de lista (preço factual da loja). */
  listPrice?: number;
  /** @deprecated Cupões não alteram preço — sempre null. */
  effectivePrice?: number | null;
  /** @deprecated */
  savings?: number | null;
  /** Há campanhas/cupões informativos na loja. */
  storeCouponsAvailable?: boolean;
  inStock?: boolean | null;
  originalPrice?: number | null;
  /** Promoção imediata vs PVPR (≥20%). */
  isOnSale?: boolean;
  /** NEW por omissão; outlet/recondicionado não contamina ATL de novos. */
  condition?: ProductCondition;
  chipsetModel?: string | null;
  vramSpec?: string | null;
  /** Taxonomy v2 — leaf activo (opcional). */
  leafId?: string | null;
  taxonomyPath?: string | string[] | null;
  brandNormalized?: string | null;
  /** Atributos tipados do catálogo (FASE 7.8). */
  typedAttributes?: Record<string, unknown> | null;
  /** FASE 7.15 — knowledge factual (opcional, da API detail). */
  knowledge?: {
    leaf?: string | null;
    attributes?: Record<string, unknown>;
    groups?: Array<{
      id: string;
      label: string;
      items: Array<{
        key: string;
        label: string;
        value: string;
        source?: string;
      }>;
    }>;
    sources?: Record<string, string>;
    completeness?: number;
  } | null;
  knowledgeCompleteness?: number | null;
  /** FASE 7.16 — insights factuais (opcional). */
  insights?: {
    currentPosition?: string;
    currentPositionLabel?: string;
    priceTrend?: string;
    priceTrendLabel?: string;
    availability?: string;
    availabilityLabel?: string;
    priceVolatility?: string;
    priceVolatilityLabel?: string;
    recommendation?: string;
    recommendationLabel?: string;
    confidence?: number;
    dataQuality?: number;
    cards?: Array<{ id: string; tone: string; label: string }>;
    summary?: string[];
    pros?: string[];
    cons?: string[];
    timeline?: Array<{
      id: string;
      date: string;
      label: string;
      detail: string;
    }>;
    [key: string]: unknown;
  } | null;
  recommendation?: string | null;
  recommendationConfidence?: number | null;
  /** Canónico — BUY | WAIT | UNKNOWN (Hub ConsumerDecision). */
  consumerDecision?: {
    verdict: "BUY" | "WAIT" | "UNKNOWN";
    confidence: number;
    reason: string;
    evidence?: {
      current_price?: number | null;
      historical_min?: number | null;
      historical_max?: number | null;
      sample_days?: number;
      span_days?: number;
      eligible_observations?: number;
      price_change_count?: number;
      buyable_stores?: number;
      stale_hours?: number | null;
    } | null;
    policy_version?: string;
  } | null;
  /** PDP read model v1 — Hub canonical bundle */
  readModel?: {
    version?: string;
    consumerDecision?: Product["consumerDecision"];
    priceAnalytics?: {
      insights?: Product["insights"];
      index?: Record<string, unknown>;
      stats?: Record<string, unknown>;
    };
    taxonomy?: Record<string, unknown>;
    discovery?: Product["recommendations"];
    knowledge?: Product["knowledge"];
  } | null;
  /** FASE 7.17 — descoberta (opcional). */
  recommendations?: {
    alternatives?: Array<Record<string, unknown>> | null;
    upgrades?: Array<Record<string, unknown>> | null;
    savings?: Array<Record<string, unknown>> | null;
    similar?: Array<Record<string, unknown>> | null;
    alsoSearched?: Array<Record<string, unknown>> | null;
    popular?: Array<Record<string, unknown>> | null;
    recommended?: Array<Record<string, unknown>> | null;
    meta?: Record<string, unknown>;
  } | null;
  /** Galeria — URLs únicas das ofertas. */
  imageUrls?: string[];
  /** True só se o bot publicou este produto no canal Telegram. */
  sentToTelegram?: boolean;
  /** ISO timestamp — quando a oportunidade foi detetada / publicada. */
  detectedAt?: string | null;
  publishedAt?: string | null;
  /** Lymiar v2 — preço de referência e desconto real. */
  referencePrice?: number | null;
  referenceSource?: string | null;
  realDiscountPct?: number | null;
  promotionConfidence?: number | null;
  dealScore?: number | null;
}
