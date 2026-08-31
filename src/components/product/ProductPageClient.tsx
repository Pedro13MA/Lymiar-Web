"use client";

import { useEffect, useMemo, useState } from "react";
import {
  detailToProduct,
  fetchPriceHistory,
  fetchProductMetrics,
  getProductBySlug,
  type ProductMetricsOut,
} from "@/lib/api";
import type { Product, PricePoint } from "@/lib/types";
import {
  computeDataConfidence,
  estimateSeasonality,
  historySpanDays,
  isAbsoluteHistoricalMin,
  MIN_HISTORY_SPAN_DAYS,
} from "@/lib/product-insights";
import {
  fetchClientRecommendations,
  recommendationsFromApi,
  type DiscoveryCard,
  type ProductRecommendations,
} from "@/lib/product-discovery";
import { pickSimilarAlternatives } from "@/lib/product-similar-alternatives";
import { buildPremiumProductBreadcrumbs } from "@/lib/product-breadcrumb-premium";
import { buildVerdictFromConsumerDecision } from "@/lib/consumer-decision";
import { isP34ProductPageEnabled } from "@/lib/product/flags";
import { PriceHistoryChartLazy as PriceHistoryChart } from "@/components/PriceHistoryChartLazy";
import { ProductBreadcrumb } from "@/components/product/ProductBreadcrumb";
import { ProductHero } from "@/components/product/ProductHero";
import { ProductJsonLd } from "@/components/product/ProductJsonLd";
import { StoreCompareTable } from "@/components/product/StoreCompareTable";
import {
  ProductPageP34,
  ProductPdpSkeleton,
} from "@/components/product/p34";
import { storeDisplayName } from "@/lib/storeLogos";
import { formatEUR } from "@/lib/utils";
import Link from "next/link";

type Props = { slug: string };

function Stars({ stars }: { stars: number }) {
  const s = Math.max(0, Math.min(5, Math.round(stars)));
  return (
    <span className="tracking-tight text-amber-500" aria-hidden>
      {"★".repeat(s)}
      <span className="text-slate-300">{"☆".repeat(Math.max(0, 5 - s))}</span>
    </span>
  );
}

/** Dias reais observados — nunca inventa 1 dia a partir de histórico vazio. */
function observedSpanDays(history: PricePoint[]): number {
  if (!history.length) return 0;
  if (history.length === 1) return 1;
  return Math.max(1, Math.round(historySpanDays(history)));
}

function mergeHistory(
  primary: PricePoint[],
  fallback: PricePoint[],
): PricePoint[] {
  const byDate = new Map<string, number>();
  for (const p of [...fallback, ...primary]) {
    if (!(p.price > 0) || !p.date) continue;
    byDate.set(String(p.date).slice(0, 10), p.price);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, price]) => ({ date, price }));
}

function mergeRecs(
  a: ProductRecommendations | null,
  b: ProductRecommendations | null,
): ProductRecommendations | null {
  if (!a && !b) return null;
  const pick = <T,>(x: T[] | null | undefined, y: T[] | null | undefined) => {
    const out = [...(x || []), ...(y || [])];
    return out.length ? out : null;
  };
  return {
    alternatives: pick(a?.alternatives, b?.alternatives),
    upgrades: pick(a?.upgrades, b?.upgrades),
    savings: pick(a?.savings, b?.savings),
    similar: pick(a?.similar, b?.similar),
    alsoSearched: pick(a?.alsoSearched, b?.alsoSearched),
    popular: pick(a?.popular, b?.popular),
    recommended: pick(a?.recommended, b?.recommended),
    meta: a?.meta || b?.meta,
  };
}

function buildVerdictCopy(opts: {
  spanDays: number;
  storeCount: number;
  aboveAvg: boolean;
  currentIsMin: boolean;
  confidenceScore: number;
  bestStoreLabel: string | null;
  observations: number;
}): { title: string; lines: string[] } {
  const {
    spanDays,
    storeCount,
    aboveAvg,
    currentIsMin,
    confidenceScore,
    bestStoreLabel,
    observations,
  } = opts;

  const thinHistory =
    spanDays < Math.min(14, MIN_HISTORY_SPAN_DAYS / 2) ||
    confidenceScore < 35 ||
    observations < 3;

  const spanLabel =
    spanDays <= 0
      ? "ainda sem série de preços suficiente"
      : spanDays === 1
        ? "há 1 dia"
        : `há ${spanDays} dias`;

  if (thinHistory) {
    return {
      title: "O Lymiar ainda está a observar este produto",
      lines: [
        spanDays <= 0
          ? "Ainda não temos uma série de preços fiável para este produto."
          : `Acompanhamos este produto ${spanLabel}.`,
        "Ainda não existe informação suficiente para recomendar a compra.",
        storeCount > 0
          ? `Neste momento existem ${storeCount} loja${storeCount === 1 ? "" : "s"} com oferta.`
          : "Ainda não há ofertas suficientes para comparar lojas.",
      ],
    };
  }

  if (currentIsMin || (!aboveAvg && confidenceScore >= 50)) {
    const lines = [
      `O Lymiar acompanha este produto ${spanLabel}.`,
      `Neste momento existem ${storeCount} loja${storeCount === 1 ? "" : "s"} com oferta.`,
      currentIsMin
        ? "O preço actual corresponde ao mínimo observado."
        : "O preço encontra-se abaixo da média observada.",
    ];
    if (bestStoreLabel) {
      lines.push(
        `A ${bestStoreLabel} apresenta actualmente o melhor preço.`,
      );
    }
    return {
      title: "Vale a pena comprar",
      lines,
    };
  }

  const lines = [
    `O Lymiar acompanha este produto ${spanLabel}.`,
    `Neste momento existem ${storeCount} loja${storeCount === 1 ? "" : "s"} com oferta.`,
    aboveAvg
      ? "O preço encontra-se acima da média observada."
      : "O preço ainda não se destaca claramente face ao histórico.",
  ];
  if (bestStoreLabel) {
    lines.push(
      `Se fores comprar agora, a ${bestStoreLabel} tem o melhor preço observado.`,
    );
  }
  return {
    title: "Recomendamos esperar",
    lines,
  };
}

export function ProductPageClient({ slug }: Props) {
  const [product, setProduct] = useState<Product | null>(null);
  const [metrics, setMetrics] = useState<ProductMetricsOut | null>(null);
  const [seriesHistory, setSeriesHistory] = useState<PricePoint[]>([]);
  const [similar, setSimilar] = useState<DiscoveryCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProduct(null);
    setMetrics(null);
    setSeriesHistory([]);
    setSimilar([]);

    getProductBySlug(slug)
      .then(async (detail) => {
        if (cancelled) return;
        const mapped = detailToProduct(detail);
        setProduct(mapped);

        const [metricsRes, historyRes] = await Promise.all([
          fetchProductMetrics(mapped.ean).catch(() => null),
          fetchPriceHistory(mapped.slug || mapped.ean, 365, "daily").catch(
            () => null,
          ),
        ]);
        if (cancelled) return;
        setMetrics(metricsRes);

        const fromSeries =
          historyRes?.points?.map((p) => ({
            date: p.date,
            price: p.price,
          })) ?? [];
        const merged = mergeHistory(fromSeries, mapped.history);
        setSeriesHistory(merged);
        if (merged.length > mapped.history.length) {
          setProduct({ ...mapped, history: merged });
        }

        const apiRecs = recommendationsFromApi(mapped.recommendations);
        let picked = pickSimilarAlternatives(mapped, apiRecs, 6);
        if (picked.length < 4) {
          const clientRecs = await fetchClientRecommendations(mapped, {
            forceSearch: true,
          }).catch(() => null);
          if (!cancelled) {
            picked = pickSimilarAlternatives(
              mapped,
              mergeRecs(apiRecs, clientRecs),
              6,
            );
          }
        }
        if (!cancelled) setSimilar(picked);
      })
      .catch((err) => {
        if (!cancelled) {
          setProduct(null);
          setError(err instanceof Error ? err.message : "Produto não encontrado");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const historyForInsights = useMemo(() => {
    if (!product) return [];
    return seriesHistory.length ? seriesHistory : product.history;
  }, [product, seriesHistory]);

  const seasonality = useMemo(() => {
    if (!product) return null;
    return estimateSeasonality(
      historyForInsights,
      product.currentPrice,
      product.seasonality.timesBelowCurrent12m,
    );
  }, [product, historyForInsights]);

  const confidence = useMemo(() => {
    if (!product) return null;
    return computeDataConfidence({
      history: historyForInsights,
      storeCount: metrics?.storeCount ?? product.offers.length,
      samples30d: metrics?.samples30d,
      samples90d: Math.max(
        metrics?.samples90d ?? 0,
        historyForInsights.length,
      ),
      volatilityPct: metrics?.volatilityPct,
    });
  }, [product, metrics, historyForInsights]);

  if (loading) {
    if (isP34ProductPageEnabled()) {
      return <ProductPdpSkeleton />;
    }
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="h-5 w-56 animate-pulse rounded bg-slate-100" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100 sm:h-80" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-10 w-36 animate-pulse rounded bg-slate-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !product || !seasonality || !confidence) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Ainda não temos este produto
        </h1>
        <p className="mt-3 text-slate-500">
          Pode ser um link antigo, um erro temporário, ou um produto sem histórico
          suficiente no Lymiar. Experimenta a pesquisa na página inicial.
        </p>
      </main>
    );
  }

  const histMin =
    historyForInsights.length > 0
      ? Math.min(
          product.historicalMin,
          ...historyForInsights.map((p) => p.price),
        )
      : product.historicalMin;
  const histMax =
    historyForInsights.length > 0
      ? Math.max(
          product.historicalMax,
          ...historyForInsights.map((p) => p.price),
        )
      : product.historicalMax;
  const storeCount = Math.max(
    metrics?.storeCount ?? 0,
    product.offers.length,
  );
  const spanDays = observedSpanDays(historyForInsights);
  const observations = Math.max(
    historyForInsights.length,
    metrics?.samples90d ?? 0,
    metrics?.samples30d ?? 0,
  );

  const avgObserved = metrics?.avg30d ?? product.avg30d;
  const currentIsMin = isAbsoluteHistoricalMin(
    product.currentPrice,
    histMin,
  );
  const aboveAvg = product.currentPrice > avgObserved;

  const sortedOffers = [...product.offers].sort((a, b) => a.price - b.price);
  const bestOffer = sortedOffers[0] ?? null;
  const bestStore = bestOffer?.storeName || bestOffer?.store || null;
  const bestStoreLabel = bestStore
    ? storeDisplayName(bestStore, bestStore)
    : null;

  const verdict =
    buildVerdictFromConsumerDecision(product, {
      spanDays,
      storeCount,
      observations,
      bestStoreLabel,
    }) ??
    buildVerdictCopy({
      spanDays,
      storeCount,
      aboveAvg,
      currentIsMin,
      confidenceScore: confidence.score,
      bestStoreLabel,
      observations,
    });

  const breadcrumbs = buildPremiumProductBreadcrumbs({
    category: product.category,
    subcategory: product.subcategory,
    subcategoryLabel: product.subcategoryLabel,
    leafId: product.leafId,
    taxonomyPath: product.taxonomyPath,
    brand: product.brand,
    productName: product.name,
    chipsetModel: product.chipsetModel,
  });

  const productWithHistory =
    historyForInsights.length > product.history.length
      ? { ...product, history: historyForInsights }
      : product;

  if (isP34ProductPageEnabled()) {
    return (
      <ProductPageP34
        product={productWithHistory}
        slug={slug}
        breadcrumbs={breadcrumbs}
        verdict={verdict}
        confidence={confidence}
        spanDays={spanDays}
        storeCount={storeCount}
        observations={observations}
        similar={similar}
      />
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-6 sm:space-y-12 sm:px-6 sm:py-10">
      <ProductJsonLd product={productWithHistory} />
      <ProductBreadcrumb crumbs={breadcrumbs} />

      <ProductHero product={productWithHistory} />

      <section
        id="porque"
        aria-label="Veredicto Lymiar"
        className="scroll-mt-28 space-y-3"
      >
        <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
          {verdict.title}
        </h2>
        <div className="max-w-2xl space-y-2 text-[15px] leading-relaxed text-slate-600">
          {verdict.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="text-sm text-slate-500">
          Baseado em {spanDays} dias observados · {storeCount}{" "}
          {storeCount === 1 ? "loja" : "lojas"} · {observations}{" "}
          {observations === 1 ? "observação" : "observações"}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold text-slate-900">
          Confiança nos dados
        </h2>
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Stars stars={confidence.stars} />
          <span>{confidence.label}</span>
        </p>
      </section>

      <section id="lojas" className="scroll-mt-28 space-y-3">
        <h2 className="font-display text-xl font-bold text-slate-900">
          Lojas observadas
        </h2>
        <StoreCompareTable offers={product.offers} />
      </section>

      <section id="historico" className="scroll-mt-28 space-y-3">
        <PriceHistoryChart
          productId={slug}
          currentPrice={product.currentPrice}
          fallbackHistory={historyForInsights}
        />
      </section>

      {similar.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-slate-900">
            Produtos semelhantes
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/p/?id=${encodeURIComponent(p.slug)}`}
                  className="block rounded-xl border border-slate-200 p-3 hover:border-orange-200"
                >
                  <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                  <p className="mt-1 text-sm font-bold tabular-nums">
                    {formatEUR(p.currentPrice)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
