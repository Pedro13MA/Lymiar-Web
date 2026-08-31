/** Cliente HTTP para a API FastAPI Lymiar (VPS). */

import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiGet, isAbortError } from "@/lib/api-client";
import type {
  DecisionScore,
  DecisionSemaphore,
  LymiarIndex,
  Offer,
  PaymentMethod,
  PricePoint,
  Product,
  ProductCondition,
  Promotion,
  Seasonality,
  ShippingInfo,
  SmartCoupon,
  StockStatus,
  StoreCampaign,
} from "@/lib/types";

export { getApiBaseUrl } from "@/lib/api-base-url";

/* ——— shapes from FastAPI ——— */

export type ApiProductSummary = {
  slug: string;
  ean: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  currentPrice: number;
  avg30d?: number | null;
  historicalMin?: number | null;
  historicalMax?: number | null;
  dropTodayPct?: number | null;
  lymiarIndex?: number;
  /** TEMP alias — API VPS ainda pode emitir limiarIndex (Fase B4.2). */
  limiarIndex?: number;
  semaphore: DecisionSemaphore;
  summary: string;
  isHistoricalMin?: boolean;
  isOnSale?: boolean;
  discountPct?: number | null;
  cheapestStore?: string | null;
  stores?: string[];
  inStock?: boolean | null;
  originalPrice?: number | null;
  condition?: ProductCondition | string | null;
  chipsetModel?: string | null;
  vramSpec?: string | null;
  /** True apenas quando o bot confirmou publicação no Telegram. */
  sentToTelegram?: boolean;
  /** ISO — publicação Telegram / deteção. */
  publishedAt?: string | null;
  detectedAt?: string | null;
  listPrice?: number | null;
  effectivePrice?: number | null;
  savings?: number | null;
  couponCode?: string | null;
  offerUrl?: string | null;
  /** FASE 8.5.1 — taxonomy v2 passthrough */
  leaf_id?: string | null;
  taxonomy_path?: string | string[] | null;
  subcategory?: string | null;
  subcategoryLabel?: string | null;
  /** Lymiar v2 */
  referencePrice?: number | null;
  referenceSource?: string | null;
  realDiscountPct?: number | null;
  promotionConfidence?: number | null;
  dealScore?: number | null;
};

export type CouponProductsResponse = {
  store: string;
  code: string;
  coupon: ApiSmartCoupon;
  total: number;
  limit: number;
  offset: number;
  results: ApiProductSummary[];
};

export type FacetBucket = {
  value: string;
  label: string;
  count: number;
};

export type SearchFacets = {
  categories: FacetBucket[];
  subcategories?: FacetBucket[];
  brands: FacetBucket[];
  stores: FacetBucket[];
  types: FacetBucket[];
  models?: FacetBucket[];
  vram?: FacetBucket[];
  series?: FacetBucket[];
  sockets?: FacetBucket[];
  capacities?: FacetBucket[];
  formats?: FacetBucket[];
  in_stock?: FacetBucket[];
};

/** FASE 7.2/7.3 — facet dinâmico Taxonomy v2 (aditivo; legado `facets` intacto). */
export type TaxonomyFacetValue = {
  value: string;
  label: string;
  count: number;
  selected?: boolean;
};

export type TaxonomyFacetType = "enum" | "number" | "boolean" | "range";

export type TaxonomyFacet = {
  id: string;
  label: string;
  type: TaxonomyFacetType | string;
  values: TaxonomyFacetValue[];
  count: number;
  selected?: boolean;
};

/** FASE 7.21 — destaque canónico na pesquisa (aditivo). */
export type CanonicalHighlight = {
  slug: string;
  title: string;
  variantCount: number;
  minPrice?: number | null;
  brandCount?: number;
  imageUrl?: string | null;
  href?: string;
};

export type SearchResponse = {
  query: string;
  total: number;
  limit: number;
  offset: number;
  sortBy: string;
  inferredCategory?: string | null;
  results: ApiProductSummary[];
  facets: SearchFacets;
  /** FASE 7.2 — opcional; ausente/vazio → UI legado */
  taxonomyFacets?: TaxonomyFacet[];
  /** FASE 7.21 — destaque canónico (não altera results) */
  canonicalHighlight?: CanonicalHighlight | null;
  /** P3 Block 2 — intent (aditivo; null se flag OFF) */
  intent?: SearchIntentPayload | null;
  didYouMean?: string[];
  relatedQueries?: string[];
  categoryRedirect?: { slug: string; url: string } | null;
};

export type SearchIntentPayload = {
  original?: string;
  normalized?: string;
  brand?: string | null;
  brands?: string[];
  category_profile?: string | null;
  leaf?: string | null;
  model?: string | null;
  intent_type?: string;
  confidence?: number;
  did_you_mean?: string[];
  related_queries?: string[];
  category_redirect?: string | null;
};

export type SearchSuggestItem = {
  ean?: string;
  slug?: string;
  name?: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  currentPrice?: number | null;
  url?: string | null;
  type?: string;
  label?: string;
  title?: string;
  text?: string;
};

export type SearchSuggestResponse = {
  query: string;
  normalized?: string;
  intent?: SearchIntentPayload | null;
  products: SearchSuggestItem[];
  categories: SearchSuggestItem[];
  brands: SearchSuggestItem[];
  suggestions: SearchSuggestItem[];
  landings: SearchSuggestItem[];
  categoryRedirect?: { slug: string; url: string } | null;
  engine?: string;
};

export type CategorySeo = {
  slug: string;
  title: string;
  description: string;
  canonical_url: string;
  meta_title?: string | null;
  meta_description?: string | null;
  robots?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  twitter_card?: string | null;
};

export type CategoryFaqItem = {
  question: string;
  answer: string;
};

export type CategorySeoFull = {
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  description: string;
  canonical_url: string;
  canonical_path: string;
  breadcrumbs: CategoryBreadcrumb[];
  robots: string;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  og_url?: string | null;
  twitter_card?: string | null;
  faq: CategoryFaqItem[];
  json_ld: Record<string, unknown>[];
  level?: number | null;
  display_name?: string | null;
  updated_hint?: string | null;
};

export type CategoryBreadcrumb = {
  slug: string;
  display_name: string;
  path?: string | null;
};

export type CategoryChild = {
  slug: string;
  display_name: string;
  level: number;
  parent?: string | null;
  is_active?: boolean;
  children_count?: number;
};

export type CategorySummary = {
  slug: string;
  display_name: string;
  level: number;
  children_count: number;
  seo: CategorySeo;
};

export type CategoriesListResponse = {
  count: number;
  categories: CategorySummary[];
};

export type CategoryDetail = {
  slug: string;
  display_name: string;
  parent?: string | null;
  level: number;
  is_active: boolean;
  taxonomy_path: string[];
  breadcrumbs: CategoryBreadcrumb[];
  children: CategoryChild[];
  seo: CategorySeo;
  faq?: CategoryFaqItem[];
  json_ld?: Record<string, unknown>[];
  updated_hint?: string | null;
};

export type CategoryProductsResponse = {
  slug: string;
  display_name: string;
  level: number;
  breadcrumbs: CategoryBreadcrumb[];
  seo: CategorySeo;
  query?: string | null;
  total: number;
  limit: number;
  offset: number;
  sortBy: string;
  results: ApiProductSummary[];
  facets: SearchFacets;
  taxonomyFacets?: TaxonomyFacet[];
};

export type SearchSortBy =
  | "lymiar_desc"
  | "price_asc"
  | "price_desc"
  | "discount_desc";

export type SearchParams = {
  limit?: number;
  offset?: number;
  category?: string;
  brand?: string;
  store?: string;
  type?: string;
  model?: string;
  vram?: string;
  series?: string;
  socket?: string;
  capacity?: string;
  format?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: SearchSortBy;
  inStockOnly?: boolean;
  subcategory?: string;
  /** FASE 7.4 — filtros taxonomy (multi-value por chave) */
  taxonomyFilters?: Record<string, string[]>;
  /** AbortController — cancela pedidos obsoletos (typeahead / pesquisa). */
  signal?: AbortSignal;
};

export type ApiPaymentMethod = {
  id: string;
  name: string;
  icon?: string | null;
};

export type ApiShippingInfo = {
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  shippingCost?: string;
  supportsPickup?: boolean;
};

export type ApiOffer = {
  store: string;
  storeName: string;
  slug?: string | null;
  logoUrl?: string | null;
  logo_url?: string | null;
  url: string;
  price: number;
  currency?: string;
  originalPrice?: number | null;
  effectivePrice?: number | null;
  inStock?: boolean | null;
  stockStatus?: "in_stock" | "out_of_stock" | "unknown" | null;
  stock_status?: "in_stock" | "out_of_stock" | "unknown" | null;
  couponCode?: string | null;
  couponLabel?: string | null;
  /** Backend snake_case (OfferOut). */
  payment_methods?: ApiPaymentMethod[];
  shipping_info?: ApiShippingInfo | null;
  /** CamelCase fallback se o proxy normalizar. */
  paymentMethods?: ApiPaymentMethod[];
  shippingInfo?: ApiShippingInfo | string | null;
  smartBasketOpportunity?: boolean;
};

export type ApiProductDetail = {
  slug: string;
  ean: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
  subcategoryLabel?: string | null;
  imageUrl?: string | null;
  currency?: string;
  currentPrice: number;
  effectivePrice?: number | null;
  avg30d?: number | null;
  historicalMin?: number | null;
  historicalMax?: number | null;
  dropTodayPct?: number | null;
  originalPrice?: number | null;
  isOnSale?: boolean;
  condition?: ProductCondition | string | null;
  history: PricePoint[];
  offers: ApiOffer[];
  decision: {
    finalScore: number;
    publish: boolean;
    tier: string;
    reason: string;
    discountPct: number;
    zScore?: number | null;
    dealQuality: string;
    opportunityType: string;
    historicalAvg?: number | null;
    historicalMin?: number | null;
    isHistoricalMin: boolean;
    cheapestStore?: string | null;
    feedCategory?: string;
    bullets: string[];
    semaphore: DecisionSemaphore;
    lymiarIndex?: LymiarIndex;
    /** TEMP alias — API VPS legada. */
    limiarIndex?: LymiarIndex;
  };
  activePromotion?: Record<string, unknown> | null;
  activeCoupon?: Record<string, unknown> | null;
  activeCampaign?: Record<string, unknown> | null;
  storeCouponsAvailable?: boolean;
  smartBasketOpportunity?: {
    smartBasketOpportunity?: boolean;
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
  } | null;
  /** Lymiar v2 */
  referencePrice?: number | null;
  referenceSource?: string | null;
  realDiscountPct?: number | null;
  promotionConfidence?: number | null;
  dealScore?: number | null;
  historicalLow?: number | null;
  historicalHigh?: number | null;
  priceTrend?: string | null;
  dailySummary?: Array<Record<string, unknown>> | null;
  chipsetModel?: string | null;
  vramSpec?: string | null;
  leaf_id?: string | null;
  product_kind_v2?: string | null;
  taxonomy_path?: string | string[] | null;
  brand_normalized?: string | null;
  taxonomy_version?: string | null;
  typed_attributes?: Record<string, unknown> | null;
  imageUrls?: string[] | null;
  /** FASE 7.15 — opcional */
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
  /** FASE 7.16 — opcional */
  insights?: Record<string, unknown> | null;
  /** Canónico — BUY | WAIT | UNKNOWN (Hub ConsumerDecision engine) */
  consumerDecision?: {
    verdict: "BUY" | "WAIT" | "UNKNOWN";
    confidence: number;
    reason: string;
    evidence: Record<string, unknown>;
    policy_version: string;
  } | null;
  readModel?: Record<string, unknown> | null;
  recommendation?: string | null;
  recommendationConfidence?: number | null;
  recommendations?: Product["recommendations"];
};

export type ApiSmartCoupon = {
  store?: string | null;
  storeSlug?: string | null;
  storeCode: string;
  code?: string | null;
  discountPct?: number | null;
  discountKind?: string;
  discountType?: string | null;
  discountAmount?: number | null;
  discountValue?: number | null;
  appliesTo?: string;
  category?: string | null;
  title?: string | null;
  campaignRef?: string | null;
  description?: string | null;
  descriptionFull?: string | null;
  terms?: string | null;
  conditions?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive?: boolean;
  status?: string | null;
  brands?: string[] | null;
  /** Página oficial da campanha (Awin). */
  url?: string | null;
};

export type ApiStoreCampaign = {
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
};

export type CampaignsResponse = {
  store: string;
  campaigns: ApiStoreCampaign[];
  coupons: ApiSmartCoupon[];
};

function normalizeCondition(raw: unknown): ProductCondition {
  const v = String(raw || "NEW").trim().toUpperCase();
  if (v === "OUTLET" || v === "REFURBISHED" || v === "OPEN_BOX") return v;
  return "NEW";
}

function formatShippingInfo(
  info: ApiShippingInfo | string | null | undefined,
): string | undefined {
  if (!info) return undefined;
  if (typeof info === "string") return info.trim() || undefined;
  const min = info.estimatedDaysMin ?? 2;
  const max = info.estimatedDaysMax ?? 5;
  const pickup = info.supportsPickup ? " · levantamento" : "";
  return `${min}–${max} dias${pickup}`;
}

function mapShippingDetails(
  info: ApiShippingInfo | string | null | undefined,
): ShippingInfo | null {
  if (!info || typeof info === "string") return null;
  return {
    estimatedDaysMin: info.estimatedDaysMin ?? 2,
    estimatedDaysMax: info.estimatedDaysMax ?? 5,
    shippingCost: info.shippingCost,
    supportsPickup: Boolean(info.supportsPickup),
  };
}

function mapStockStatus(
  status: ApiOffer["stockStatus"] | ApiOffer["stock_status"],
  inStock: boolean | null | undefined,
): StockStatus {
  if (status === "in_stock" || status === "out_of_stock" || status === "unknown") {
    return status;
  }
  if (inStock === true) return "in_stock";
  if (inStock === false) return "out_of_stock";
  return "unknown";
}

function mapPaymentMethods(
  methods: ApiPaymentMethod[] | undefined,
): PaymentMethod[] {
  if (!methods?.length) return [];
  return methods
    .filter((m) => m && (m.id || m.name))
    .map((m) => ({
      id: String(m.id || ""),
      label: String(m.name || m.id || ""),
      icon: m.icon ? String(m.icon) : undefined,
    }));
}

export type ApiPromotion = {
  externalId: string;
  merchantId: string;
  storeName: string;
  storeSlug: string;
  title?: string | null;
  campaignRef?: string | null;
  description?: string | null;
  code?: string | null;
  url: string;
  promotionType?: string;
  discountKind?: string;
  discountValue?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
};

export type DealsResponse = {
  count: number;
  results: ApiProductSummary[];
};

export type PromotionsResponse = {
  storeSlug: string;
  count: number;
  results: ApiPromotion[];
};

const DEFAULT_SEASONALITY: Seasonality = {
  timesBelowCurrent12m: 0,
  note: "Sazonalidade estimada a partir do histórico de preços Lymiar.",
  markers: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: "",
    kind: "neutral" as const,
  })),
};

/** Score 0–100 a partir de summary (lymiarIndex oficial | limiarIndex TEMP). */
export function readSummaryLymiarScore(
  s: Pick<ApiProductSummary, "lymiarIndex" | "limiarIndex">,
): number {
  const raw = s.lymiarIndex ?? s.limiarIndex;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

const EMPTY_LYMIAR_FACTORS: LymiarIndex["factors"] = {
  vsAvg30d: { score: 0, label: "Preço vs média 30d", detail: "—" },
  historicalMin: { score: 0, label: "Mínimo histórico", detail: "—" },
  couponApplied: { score: 0, label: "Cupão aplicado", detail: "—" },
  volatility: { score: 0, label: "Volatilidade", detail: "—" },
};

/** Garante sempre um LymiarIndex com `.value` (evita TypeError em produção). */
export function coerceLymiarIndex(
  raw: LymiarIndex | number | null | undefined,
  summary = "",
): LymiarIndex {
  if (raw && typeof raw === "object") {
    const value = Number((raw as LymiarIndex).value);
    return {
      value: Number.isFinite(value) ? value : 0,
      summary: String((raw as LymiarIndex).summary ?? summary ?? ""),
      factors: (raw as LymiarIndex).factors ?? EMPTY_LYMIAR_FACTORS,
    };
  }
  const value = typeof raw === "number" ? raw : Number(raw);
  return {
    value: Number.isFinite(value) ? value : 0,
    summary: summary || "",
    factors: EMPTY_LYMIAR_FACTORS,
  };
}

export function summaryToProduct(s: ApiProductSummary): Product {
  const score = readSummaryLymiarScore(s);
  const index = coerceLymiarIndex(score, s.summary || "");
  const decision: DecisionScore = {
    finalScore: score,
    publish: s.semaphore === "buy",
    tier: score >= 85 ? "S" : score >= 50 ? "A" : "B",
    reason: s.summary,
    breakdown: {
      baseQuality: 0,
      priceOpportunity: 0,
      trend: 0,
      rarity: 0,
      categoryOverload: 0,
      storeDominance: 0,
      feedbackAdjustment: 0,
    },
    discountPct: Number(s.realDiscountPct ?? s.discountPct ?? 0),
    dealQuality: "NORMAL",
    opportunityType: s.isHistoricalMin ? "NEW_LOW" : "NOISE",
    historicalAvg: s.avg30d ?? null,
    historicalMin: s.historicalMin ?? null,
    isHistoricalMin: Boolean(s.isHistoricalMin),
    cheapestStore: s.cheapestStore ?? null,
    feedCategory: "other",
    bullets: [s.summary],
    semaphore: s.semaphore,
    lymiarIndex: index,
  };
  return {
    slug: s.slug,
    ean: s.ean,
    name: s.name,
    brand: s.brand,
    category: s.category || "",
    subcategory: (s as { subcategory?: string | null }).subcategory ?? undefined,
    subcategoryLabel:
      (s as { subcategoryLabel?: string | null }).subcategoryLabel ?? undefined,
    leafId: s.leaf_id ?? undefined,
    taxonomyPath: Array.isArray(s.taxonomy_path)
      ? s.taxonomy_path
      : typeof s.taxonomy_path === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(s.taxonomy_path);
              return Array.isArray(parsed) ? parsed : undefined;
            } catch {
              return undefined;
            }
          })()
        : s.taxonomy_path ?? undefined,
    imageUrl: s.imageUrl,
    currentPrice: s.currentPrice,
    listPrice: s.listPrice ?? undefined,
    effectivePrice: s.effectivePrice ?? undefined,
    savings: s.savings ?? undefined,
    avg30d: s.avg30d ?? s.currentPrice,
    historicalMin: s.historicalMin ?? s.currentPrice,
    historicalMax: s.historicalMax ?? s.currentPrice,
    dropTodayPct: s.dropTodayPct ?? undefined,
    history: [],
    offers: s.offerUrl
      ? [
          {
            store: s.cheapestStore || "store",
            storeName: s.cheapestStore || "Loja",
            url: s.offerUrl,
            price: s.listPrice ?? s.currentPrice,
            effectivePrice: undefined,
          },
        ]
      : [],
    decision,
    seasonality: DEFAULT_SEASONALITY,
    inStock: s.inStock,
    originalPrice: s.originalPrice,
    isOnSale: Boolean(s.isOnSale),
    condition: normalizeCondition(s.condition),
    chipsetModel: s.chipsetModel,
    vramSpec: s.vramSpec,
    sentToTelegram: Boolean(s.sentToTelegram),
    detectedAt: s.detectedAt ?? s.publishedAt ?? undefined,
    publishedAt: s.publishedAt ?? s.detectedAt ?? undefined,
    referencePrice: s.referencePrice ?? undefined,
    referenceSource: s.referenceSource ?? undefined,
    realDiscountPct: s.realDiscountPct ?? undefined,
    promotionConfidence: s.promotionConfidence ?? undefined,
    dealScore: s.dealScore ?? undefined,
  };
}

export function mapSmartCoupon(c: ApiSmartCoupon): SmartCoupon {
  const kind = (c.discountType || c.discountKind || "percent") as Promotion["discountKind"];
  const pct =
    c.discountPct ??
    (kind === "percent" ? c.discountValue ?? null : null);
  const amount =
    c.discountAmount ??
    (kind === "amount" ? c.discountValue ?? null : null);
  return {
    storeCode: c.storeSlug || c.storeCode,
    storeName: c.store || null,
    code: (c.code || "").trim(),
    discountPct: pct,
    discountKind: kind || "percent",
    discountAmount: amount,
    discountValue: c.discountValue ?? pct ?? amount,
    appliesTo: c.appliesTo,
    category: c.category,
    title: c.title,
    campaignRef: c.campaignRef || null,
    description: c.descriptionFull || c.description,
    descriptionFull: c.descriptionFull || c.description,
    terms: c.terms || c.conditions || null,
    conditions: c.terms || c.conditions || null,
    startDate: c.validFrom || c.startDate,
    endDate: c.validUntil || c.endDate,
    isActive: c.isActive,
    status: c.status,
    url: (() => {
      const u = (c.url || "").trim();
      return u.startsWith("http://") || u.startsWith("https://") ? u : null;
    })(),
  };
}

export function mapStoreCampaign(c: ApiStoreCampaign): StoreCampaign {
  return {
    storeCode: c.storeCode,
    title: c.title,
    description: c.description,
    rulesSummary: c.rulesSummary,
    appliesTo: c.appliesTo,
    category: c.category,
    couponCode: c.couponCode,
    affiliateUrl: c.affiliateUrl,
    startDate: c.startDate,
    endDate: c.endDate,
    isActive: c.isActive,
    requiresCode: c.requiresCode,
    minSpendEur: c.minSpendEur,
    discountPct: c.discountPct,
    brands: c.brands,
    maxGapEur: c.maxGapEur,
  };
}

/** Converte cupão inteligente para Promotion (CouponCard). */
export function smartCouponToPromotion(c: SmartCoupon, storeName?: string): Promotion {
  const slug = c.storeCode;
  const kind = (c.discountKind as Promotion["discountKind"]) || "percent";
  const value =
    c.discountValue ??
    (kind === "amount" ? c.discountAmount : c.discountPct) ??
    null;
  const officialUrl = (c.url || "").trim();
  const hasOfficial =
    officialUrl.startsWith("http://") || officialUrl.startsWith("https://");
  return {
    externalId: `coupon-${slug}-${c.code || c.title || "campanha"}`,
    merchantId: slug,
    storeName: c.storeName || storeName || slug,
    storeSlug: slug,
    title: c.title,
    campaignRef: c.campaignRef || null,
    description: c.descriptionFull || c.description,
    terms: c.terms || c.conditions || null,
    conditions: c.terms || c.conditions || null,
    code: c.code || null,
    url: hasOfficial ? officialUrl : `/cupoes/${encodeURIComponent(slug)}/`,
    promotionType: "voucher",
    discountKind: kind,
    discountValue: value,
    startDate: c.startDate,
    endDate: c.endDate,
    isActive: c.isActive,
  };
}

export function detailToProduct(d: ApiProductDetail): Product {
  const offers: Offer[] = (d.offers || []).map((o) => ({
    store: o.slug || o.store,
    storeName: o.storeName,
    slug: o.slug || o.store,
    logoUrl: o.logoUrl ?? o.logo_url ?? null,
    url: o.url,
    price: o.price,
    currency: o.currency,
    originalPrice: o.originalPrice,
    effectivePrice: o.effectivePrice,
    inStock: o.inStock,
    stockStatus: mapStockStatus(o.stockStatus ?? o.stock_status, o.inStock),
    couponCode: o.couponCode,
    couponLabel: o.couponLabel,
    paymentMethods: mapPaymentMethods(o.payment_methods ?? o.paymentMethods),
    shippingInfo: formatShippingInfo(o.shipping_info ?? o.shippingInfo),
    shippingDetails: mapShippingDetails(o.shipping_info ?? o.shippingInfo),
    smartBasketOpportunity: Boolean(o.smartBasketOpportunity),
  }));
  const listPrice = d.currentPrice;
  const effectivePrice = null;
  const displayPrice = listPrice;
  const bestOffer =
    offers.length > 0
      ? [...offers].sort((a, b) => a.price - b.price)[0]
      : null;
  const originalPrice = bestOffer?.originalPrice ?? d.originalPrice ?? null;
  const activeCoupon = d.activeCoupon
    ? mapSmartCoupon(d.activeCoupon as ApiSmartCoupon)
    : null;
  const activeCampaign = d.activeCampaign
    ? mapStoreCampaign(d.activeCampaign as ApiStoreCampaign)
    : null;
  return {
    slug: d.slug,
    ean: d.ean,
    name: d.name,
    brand: d.brand,
    category: d.category || "",
    subcategory: d.subcategory ?? null,
    subcategoryLabel: d.subcategoryLabel ?? null,
    imageUrl: d.imageUrl,
    currency: d.currency,
    listPrice,
    effectivePrice,
    currentPrice: displayPrice,
    avg30d: d.avg30d ?? displayPrice,
    historicalMin: d.historicalMin ?? displayPrice,
    historicalMax: d.historicalMax ?? displayPrice,
    dropTodayPct: d.dropTodayPct ?? undefined,
    history: d.history || [],
    offers,
    originalPrice,
    isOnSale: Boolean(d.isOnSale),
    condition: normalizeCondition(d.condition),
    chipsetModel: d.chipsetModel ?? undefined,
    vramSpec: d.vramSpec ?? undefined,
    leafId: d.leaf_id ?? undefined,
    taxonomyPath: Array.isArray(d.taxonomy_path)
      ? d.taxonomy_path
      : d.taxonomy_path ?? undefined,
    brandNormalized: d.brand_normalized ?? undefined,
    typedAttributes: d.typed_attributes ?? undefined,
    knowledge: d.knowledge ?? undefined,
    knowledgeCompleteness:
      typeof d.knowledgeCompleteness === "number"
        ? d.knowledgeCompleteness
        : d.knowledge && typeof d.knowledge.completeness === "number"
          ? d.knowledge.completeness
          : undefined,
    insights: d.insights
      ? (d.insights as NonNullable<Product["insights"]>)
      : undefined,
    consumerDecision: d.consumerDecision
      ? {
          verdict: d.consumerDecision.verdict,
          confidence: Number(d.consumerDecision.confidence) || 0,
          reason: String(d.consumerDecision.reason || ""),
          evidence: d.consumerDecision.evidence ?? undefined,
          policy_version: d.consumerDecision.policy_version ?? undefined,
        }
      : undefined,
    readModel: d.readModel
      ? (d.readModel as NonNullable<Product["readModel"]>)
      : undefined,
    recommendation: d.recommendation ?? undefined,
    recommendationConfidence:
      typeof d.recommendationConfidence === "number"
        ? d.recommendationConfidence
        : undefined,
    recommendations: d.recommendations ?? undefined,
    imageUrls: Array.isArray(d.imageUrls) ? d.imageUrls.filter(Boolean) : undefined,
    activeCoupon,
    activeCampaign,
    smartBasketOpportunity: null,
    storeCouponsAvailable: Boolean(d.storeCouponsAvailable || activeCoupon?.code),
    decision: {
      finalScore: d.decision.finalScore,
      publish: d.decision.publish,
      tier: (d.decision.tier as "S" | "A" | "B") || "B",
      reason: d.decision.reason,
      breakdown: {
        baseQuality: 0,
        priceOpportunity: 0,
        trend: 0,
        rarity: 0,
        categoryOverload: 0,
        storeDominance: 0,
        feedbackAdjustment: 0,
      },
      discountPct: Number(d.realDiscountPct ?? d.decision.discountPct),
      zScore: d.decision.zScore,
      dealQuality: d.decision.dealQuality as DecisionScore["dealQuality"],
      opportunityType: d.decision.opportunityType as DecisionScore["opportunityType"],
      historicalAvg: d.decision.historicalAvg,
      historicalMin: d.decision.historicalMin,
      isHistoricalMin: d.decision.isHistoricalMin,
      cheapestStore: d.decision.cheapestStore,
      feedCategory: d.decision.feedCategory || "other",
      bullets: d.decision.bullets || [],
      semaphore: d.decision.semaphore,
      lymiarIndex: coerceLymiarIndex(
        d.decision.lymiarIndex ?? d.decision.limiarIndex,
        d.decision.reason || "",
      ),
    },
    seasonality: {
      ...DEFAULT_SEASONALITY,
      timesBelowCurrent12m:
        d.decision.bullets
          ?.map((b) => {
            const m = b.match(/(\d+)\s+ocasi/);
            return m ? Number(m[1]) : null;
          })
          .find((n) => n != null) ?? 0,
    },
    activePromotion: d.activePromotion
      ? {
          externalId: String(d.activePromotion.externalId || ""),
          merchantId: String(d.activePromotion.merchantId || ""),
          storeName: String(d.activePromotion.storeName || ""),
          storeSlug: String(d.activePromotion.storeSlug || ""),
          title: (d.activePromotion.title as string) || null,
          description: (d.activePromotion.description as string) || null,
          code: (d.activePromotion.code as string) || null,
          url: String(d.activePromotion.url || ""),
          isActive: true,
        }
      : null,
    referencePrice: d.referencePrice ?? undefined,
    referenceSource: d.referenceSource ?? undefined,
    realDiscountPct: d.realDiscountPct ?? undefined,
    promotionConfidence: d.promotionConfidence ?? undefined,
    dealScore: d.dealScore ?? undefined,
  };
}

export function mapPromotion(p: ApiPromotion): Promotion {
  return {
    externalId: p.externalId,
    merchantId: p.merchantId,
    storeName: p.storeName,
    storeSlug: p.storeSlug,
    title: p.title,
    description: p.description,
    code: p.code,
    url: p.url,
    promotionType: p.promotionType,
    discountKind: (p.discountKind as Promotion["discountKind"]) || "unknown",
    discountValue: p.discountValue,
    startDate: p.startDate,
    endDate: p.endDate,
    isActive: p.isActive,
  };
}

export async function searchProducts(
  q: string,
  opts?: SearchParams,
): Promise<SearchResponse> {
  const limit = opts?.limit ?? 24;
  const offset = opts?.offset ?? 0;
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    offset: String(offset),
    sort_by: opts?.sortBy || "lymiar_desc",
  });
  if (opts?.category) params.set("category", opts.category);
  if (opts?.brand) params.set("brand", opts.brand);
  if (opts?.store) params.set("store", opts.store);
  if (opts?.type) params.set("type", opts.type);
  if (opts?.model) params.set("model", opts.model);
  if (opts?.vram) params.set("vram", opts.vram);
  if (opts?.series) params.set("series", opts.series);
  if (opts?.socket) params.set("socket", opts.socket);
  if (opts?.capacity) params.set("capacity", opts.capacity);
  if (opts?.format) params.set("format", opts.format);
  if (opts?.minPrice != null && !Number.isNaN(opts.minPrice)) {
    params.set("min_price", String(opts.minPrice));
  }
  if (opts?.maxPrice != null && !Number.isNaN(opts.maxPrice)) {
    params.set("max_price", String(opts.maxPrice));
  }
  if (opts?.inStockOnly) params.set("in_stock", "true");
  if (opts?.subcategory) params.set("subcategory", opts.subcategory);
  // FASE 7.4 — taxonomy multi-params (brand=asus&brand=msi&vram_gb=16)
  if (opts?.taxonomyFilters) {
    for (const [key, values] of Object.entries(opts.taxonomyFilters)) {
      for (const v of values) {
        if (v) params.append(key, v);
      }
    }
  }
  return apiGet<SearchResponse>(`/api/v1/search?${params}`, {
    signal: opts?.signal,
    label: "SEARCH",
  });
}

/** P3 Block 2 — typeahead agrupado (fallback legado se suggest indisponível). */
export async function suggestSearch(
  q: string,
  opts?: { limit?: number; signal?: AbortSignal },
): Promise<SearchSuggestResponse> {
  const limit = opts?.limit ?? 8;
  const params = new URLSearchParams({ q, limit: String(limit) });
  try {
    return await apiGet<SearchSuggestResponse>(
      `/api/v1/search/suggest?${params}`,
      { signal: opts?.signal, label: "SUGGEST" },
    );
  } catch (err) {
    if (isAbortError(err)) throw err;
    // Integração: API sem /suggest → não zerar typeahead
    const legacy = await searchProducts(q, { limit, signal: opts?.signal });
    return {
      query: q,
      normalized: q,
      intent: legacy.intent ?? null,
      products: legacy.results.map((p) => ({
        ean: p.ean,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        category: p.category,
        imageUrl: p.imageUrl,
        currentPrice: p.currentPrice,
        url: `/p/?id=${encodeURIComponent(p.slug)}`,
        type: "product",
      })),
      categories: [],
      brands: [],
      suggestions: [],
      landings: [],
      categoryRedirect: legacy.categoryRedirect ?? null,
      engine: "legacy-fallback",
    };
  }
}

/** FASE 7.5 — categorias L1 */
export async function getCategories(): Promise<CategoriesListResponse> {
  return apiGet<CategoriesListResponse>("/api/v1/categorias");
}

/** P3 Block 1 — árvore taxonomy (backend TreeProvider via API). Read-only. */
export type TaxonomyTreeNodeApi = {
  slug: string;
  display_name: string;
  parent?: string | null;
  level: number;
  is_active?: boolean;
  kind_allowed?: string | null;
  children: TaxonomyTreeNodeApi[];
};

export type TaxonomyTreeApiResponse = {
  taxonomy_version: string;
  source?: string;
  tree: TaxonomyTreeNodeApi[];
};

export async function getTaxonomyTree(
  taxonomyVersion?: string,
): Promise<TaxonomyTreeApiResponse> {
  const q = taxonomyVersion
    ? `?taxonomy_version=${encodeURIComponent(taxonomyVersion)}`
    : "";
  return apiGet<TaxonomyTreeApiResponse>(`/api/v1/taxonomy/tree${q}`);
}

export async function getCategory(slug: string): Promise<CategoryDetail> {
  return apiGet<CategoryDetail>(
    `/api/v1/categorias/${encodeURIComponent(slug)}`,
  );
}

export async function getCategorySeo(slug: string): Promise<CategorySeoFull> {
  return apiGet<CategorySeoFull>(
    `/api/v1/categorias/${encodeURIComponent(slug)}/seo`,
  );
}

export type CategoryProductsParams = {
  q?: string;
  limit?: number;
  offset?: number;
  sortBy?: SearchSortBy;
  taxonomyFilters?: Record<string, string[]>;
};

export async function getCategoryProducts(
  slug: string,
  opts?: CategoryProductsParams,
): Promise<CategoryProductsResponse> {
  const params = new URLSearchParams({
    limit: String(opts?.limit ?? 24),
    offset: String(opts?.offset ?? 0),
    sort_by: opts?.sortBy || "lymiar_desc",
  });
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  if (opts?.taxonomyFilters) {
    for (const [key, values] of Object.entries(opts.taxonomyFilters)) {
      for (const v of values) {
        if (v) params.append(key, v);
      }
    }
  }
  return apiGet<CategoryProductsResponse>(
    `/api/v1/categorias/${encodeURIComponent(slug)}/produtos?${params}`,
  );
}

export async function getDealsNow(
  limit = 24,
  opts?: { signal?: AbortSignal },
): Promise<DealsResponse> {
  return apiGet<DealsResponse>(`/api/v1/deals/now?limit=${limit}`, {
    signal: opts?.signal,
    label: "DEALS_NOW",
  });
}

export async function getDealsWait(
  limit = 24,
  opts?: { signal?: AbortSignal },
): Promise<DealsResponse> {
  return apiGet<DealsResponse>(`/api/v1/deals/wait?limit=${limit}`, {
    signal: opts?.signal,
    label: "DEALS_WAIT",
  });
}

export async function getDealsFair(
  limit = 24,
  opts?: { signal?: AbortSignal },
): Promise<DealsResponse> {
  // allowStatuses: rota ainda ausente em api.lymiar.com (hub local já tem /deals/fair).
  const data = await apiGet<DealsResponse | null>(
    `/api/v1/deals/fair?limit=${limit}`,
    {
      signal: opts?.signal,
      label: "DEALS_FAIR",
      allowStatuses: [404],
    },
  );
  if (!data) return { count: 0, results: [] };
  return data;
}

/** Alertas efetivamente enviados ao Telegram (ledger de publish confirmado). */
export async function getTelegramDeals(
  limit = 24,
  sinceHours = 36,
): Promise<DealsResponse> {
  return apiGet<DealsResponse>(
    `/api/v1/deals/telegram?limit=${limit}&since_hours=${sinceHours}`,
  );
}

export async function getProductBySlug(slug: string): Promise<ApiProductDetail> {
  return apiGet<ApiProductDetail>(`/api/v1/product/${encodeURIComponent(slug)}`);
}

export type HistoryGranularity = "daily" | "weekly";

export type PriceHistorySeriesPoint = {
  date: string;
  price: number;
  avgPrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  samples?: number;
};

export type PriceHistoryOut = {
  ean: string;
  days: number;
  granularity: HistoryGranularity;
  points: PriceHistorySeriesPoint[];
  currentPrice?: number | null;
  historicalMin?: number | null;
  historicalMax?: number | null;
  referencePrice?: number | null;
  referenceSource?: string | null;
  seriesSource?: string;
};

export type StorePriceSpread = {
  store: string;
  storeName: string;
  price: number;
};

export type ProductMetricsOut = {
  ean: string;
  currentPrice?: number | null;
  allTimeLow?: number | null;
  allTimeHigh?: number | null;
  avg30d?: number | null;
  avg90d?: number | null;
  storeSpreadEur?: number | null;
  storeCount: number;
  storePrices: StorePriceSpread[];
  volatilityPct?: number | null;
  samples30d: number;
  samples90d: number;
};

export async function fetchPriceHistory(
  id: string,
  days = 30,
  granularity: HistoryGranularity = "daily",
): Promise<PriceHistoryOut> {
  const params = new URLSearchParams({
    days: String(days),
    granularity,
  });
  return apiGet<PriceHistoryOut>(
    `/api/v1/product/${encodeURIComponent(id)}/history?${params}`,
  );
}

export async function fetchProductMetrics(ean: string): Promise<ProductMetricsOut> {
  return apiGet<ProductMetricsOut>(
    `/api/v1/metrics/product/${encodeURIComponent(ean)}`,
  );
}

export async function getStoreCampaigns(store: string): Promise<CampaignsResponse> {
  return apiGet<CampaignsResponse>(
    `/api/v1/campaigns?store=${encodeURIComponent(store)}`,
  );
}

export async function getCoupons(store?: string): Promise<{
  store: string | null;
  coupons: ApiSmartCoupon[];
  stores?: Array<{ slug: string; name: string; count: number }>;
  rules?: {
    store: string;
    supportsCodes: boolean;
    requiresVerification: boolean;
    displayConditions: boolean;
  } | null;
}> {
  const q = store ? `?store=${encodeURIComponent(store)}` : "";
  return apiGet(`/api/v1/coupons${q}`);
}

export async function getCouponProducts(
  store: string,
  code: string,
  limit = 48,
  offset = 0,
): Promise<CouponProductsResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiGet<CouponProductsResponse>(
    `/api/v1/coupons/${encodeURIComponent(store)}/${encodeURIComponent(code)}/products?${params}`,
  );
}

export async function getStorePromotions(
  store: string,
  limit = 50,
): Promise<PromotionsResponse> {
  return apiGet<PromotionsResponse>(
    `/api/v1/promotions/${encodeURIComponent(store)}?limit=${limit}`,
  );
}

/* ——— FASE 7.18 — Marketplace Intelligence ——— */

export type MarketplaceProductCard = {
  ean?: string | null;
  slug: string;
  name?: string | null;
  brand?: string | null;
  currentPrice?: number | null;
  imageUrl?: string | null;
  leafId?: string | null;
  category?: string | null;
  storeCount?: number | null;
  discountPct?: number | null;
  originalPrice?: number | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  changeCount?: number | null;
};

export type MarketplaceOverview = {
  products: number;
  brands: number;
  leaves: number;
  categories: number;
  stores: number;
  offers: number;
  avgPrice?: number | null;
  minPrice?: number | null;
  promotionsActive: number;
  couponsActive: number;
  lastProductUpdate?: string | null;
  lastOfferUpdate?: string | null;
  rankings?: Record<string, MarketplaceProductCard[]>;
  generatedAt?: string | null;
  cacheTtlSec?: number | null;
};

export type MarketplaceBrandListItem = {
  slug: string;
  name: string;
  products: number;
  avgPrice?: number | null;
};

export type MarketplaceBrandDetail = {
  slug: string;
  name: string;
  products: number;
  leaves: number;
  categories: number;
  avgPrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  categoryBreakdown: Array<{ slug: string; products: number }>;
  economical: MarketplaceProductCard[];
  premium: MarketplaceProductCard[];
  bestOpportunity?: MarketplaceProductCard | null;
  recommended: MarketplaceProductCard[];
};

export type MarketplaceStoreListItem = {
  slug: string;
  name: string;
  products: number;
  avgPrice?: number | null;
  minPrice?: number | null;
  lastUpdate?: string | null;
};

export type MarketplaceStoreDetail = {
  slug: string;
  name: string;
  products: number;
  avgPrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  lastUpdate?: string | null;
  categories: Array<{ slug: string; products: number }>;
  promotions: number;
  recentProducts: MarketplaceProductCard[];
};

export type MarketplaceCategoryStats = {
  slug: string;
  displayName: string;
  products: number;
  brands: number;
  stores: number;
  avgPrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  lastUpdate?: string | null;
  topBrands: Array<{ slug: string; name: string; products: number }>;
  recommendedProducts: MarketplaceProductCard[];
  leafCount: number;
};

export type MarketplaceTrending = {
  recentlyAdded: MarketplaceProductCard[];
  mostActivity?: MarketplaceProductCard[] | null;
  newestUpdates: MarketplaceProductCard[];
  newPromotions: MarketplaceProductCard[];
  note?: string | null;
};

export async function getMercado(): Promise<MarketplaceOverview> {
  return apiGet<MarketplaceOverview>("/api/v1/mercado");
}

export async function getMarcas(limit = 100): Promise<{
  count: number;
  brands: MarketplaceBrandListItem[];
}> {
  return apiGet(`/api/v1/marcas?limit=${limit}`);
}

export async function getMarca(slug: string): Promise<MarketplaceBrandDetail> {
  return apiGet(`/api/v1/marca/${encodeURIComponent(slug)}`);
}

export async function getLojas(limit = 80): Promise<{
  count: number;
  stores: MarketplaceStoreListItem[];
}> {
  return apiGet(`/api/v1/lojas?limit=${limit}`);
}

export async function getLoja(slug: string): Promise<MarketplaceStoreDetail> {
  return apiGet(`/api/v1/loja/${encodeURIComponent(slug)}`);
}

export async function getCategoryStats(
  slug: string,
): Promise<MarketplaceCategoryStats> {
  return apiGet(
    `/api/v1/categorias/${encodeURIComponent(slug)}/estatisticas`,
  );
}

export async function getMercadoTendencias(
  limit = 12,
): Promise<MarketplaceTrending> {
  return apiGet(`/api/v1/mercado/tendencias?limit=${limit}`);
}

/** FASE 7.20 — homepage agregada (read-only). */
export type HomepageCategoryCard = {
  slug: string;
  displayName: string;
  products: number;
  avgPrice?: number | null;
  brands?: number;
  stores?: number;
  imageUrl?: string | null;
};

export type HomepageMarketSummary = {
  products: number;
  brands: number;
  stores: number;
  categories: number;
  leaves?: number;
  avgPrice?: number | null;
  promotionsActive: number;
  couponsActive: number;
  classifiedPct?: number | null;
  lastProductUpdate?: string | null;
  lastOfferUpdate?: string | null;
};

export type HomepagePayload = {
  featured: MarketplaceProductCard[];
  topDeals: MarketplaceProductCard[];
  recentDrops: MarketplaceProductCard[];
  popularProducts: MarketplaceProductCard[];
  recommended: MarketplaceProductCard[];
  categories: HomepageCategoryCard[];
  trendingBrands: MarketplaceBrandListItem[];
  trendingStores: MarketplaceStoreListItem[];
  marketSummary: HomepageMarketSummary;
  latestCoupons: ApiSmartCoupon[];
  latestProducts: MarketplaceProductCard[];
  generatedAt?: string | null;
  cacheTtlSec?: number | null;
  note?: string | null;
};

export async function getHome(): Promise<HomepagePayload> {
  return apiGet<HomepagePayload>("/api/v1/home");
}

/** FASE 7.21 — Catálogo canónico. */
export type CanonicalGroupListItem = {
  slug: string;
  title: string;
  leafId?: string | null;
  variantCount: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  brandCount?: number;
  storeCount?: number;
  imageUrl?: string | null;
  brands?: string[];
};

export type CanonicalVariableAttr = {
  key: string;
  label: string;
  options: string[];
};

export type CanonicalVariantCard = {
  ean?: string | null;
  slug: string;
  name?: string | null;
  brand?: string | null;
  currentPrice?: number | null;
  imageUrl?: string | null;
  leafId?: string | null;
  storeCount?: number | null;
  selection?: Record<string, string>;
};

export type CanonicalGroupDetail = {
  slug: string;
  title: string;
  leafId?: string | null;
  variantCount: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  brandCount?: number;
  brands?: string[];
  storeCount?: number;
  imageUrl?: string | null;
  variableAttributes: CanonicalVariableAttr[];
  variants: CanonicalVariantCard[];
  href?: string | null;
};

export async function getCatalogo(opts?: {
  limit?: number;
  leaf?: string;
}): Promise<{ count: number; groups: CanonicalGroupListItem[] }> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.leaf) params.set("leaf", opts.leaf);
  const q = params.toString();
  return apiGet(`/api/v1/catalogo${q ? `?${q}` : ""}`);
}

export async function getCatalogoGroup(
  slug: string,
): Promise<CanonicalGroupDetail> {
  return apiGet(`/api/v1/catalogo/${encodeURIComponent(slug)}`);
}

export async function getCatalogoVariantes(slug: string): Promise<{
  slug: string;
  title: string;
  variableAttributes: CanonicalVariableAttr[];
  variants: CanonicalVariantCard[];
}> {
  return apiGet(`/api/v1/catalogo/${encodeURIComponent(slug)}/variantes`);
}

export async function getCatalogoSemelhantes(
  slug: string,
  limit = 8,
): Promise<{ slug: string; similares: CanonicalGroupListItem[] }> {
  return apiGet(
    `/api/v1/catalogo/${encodeURIComponent(slug)}/semelhantes?limit=${limit}`,
  );
}
