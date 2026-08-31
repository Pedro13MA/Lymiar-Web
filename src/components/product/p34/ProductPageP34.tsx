"use client";

import { BreadcrumbNav } from "@/components/nav/BreadcrumbNav";
import { PriceHistoryChartLazy as PriceHistoryChart } from "@/components/PriceHistoryChartLazy";
import { ProductHero } from "@/components/product/ProductHero";
import { ProductJsonLd } from "@/components/product/ProductJsonLd";
import { StoreCompareTable } from "@/components/product/StoreCompareTable";
import { ProductTelegramStrip } from "@/components/product/p34/ProductActionPlaceholders";
import {
  ProductCouponsSection,
  ProductHistoryHint,
  ProductStoresEmpty,
} from "@/components/product/p34/ProductCouponsSection";
import { ProductSimilarSection } from "@/components/product/p34/ProductDiscoveryPlaceholders";
import type { DiscoveryCard } from "@/lib/product-discovery";
import type { BreadcrumbCrumb } from "@/lib/product-breadcrumb";
import {
  consumerVerdictBadge,
  consumerVerdictBadgeForPdp,
  consumerVerdictTone,
  formatPdpEvidenceFootnote,
  humanConsumerReason,
  resolveConsumerDecision,
} from "@/lib/consumer-decision";
import type { DecisionSemaphore, Product } from "@/lib/types";
import { MIN_HISTORY_SPAN_DAYS } from "@/lib/product-insights";
import { formatEUR } from "@/lib/utils";
import "@/components/product/p34/product-premium.css";

type Verdict = { title: string; lines: string[] };

type Confidence = {
  stars: number;
  score: number;
};

type Props = {
  product: Product;
  slug: string;
  breadcrumbs: BreadcrumbCrumb[];
  verdict: Verdict;
  confidence: Confidence;
  spanDays: number;
  storeCount: number;
  buyableStoreCount: number;
  observations: number;
  eligibleObservations?: number | null;
  similar: DiscoveryCard[];
};

function verdictTone(sem: DecisionSemaphore | undefined): "buy" | "wait" | "unknown" {
  if (sem === "buy") return "buy";
  if (sem === "wait") return "wait";
  return "unknown";
}

function verdictBadge(tone: "buy" | "wait" | "unknown"): string {
  if (tone === "buy") return "Vale a pena comprar";
  if (tone === "wait") return "Espera mais um pouco";
  return "Ainda não sabemos";
}

/**
 * PDP P34 — hierarquia canónica + linguagem visual da homepage.
 * Não altera gráfico interno, URLs, SEO nem contratos API.
 */
export function ProductPageP34({
  product,
  slug,
  breadcrumbs,
  verdict,
  spanDays,
  storeCount,
  buyableStoreCount,
  observations,
  eligibleObservations,
  similar,
}: Props) {
  const thinHistory = spanDays < Math.min(14, MIN_HISTORY_SPAN_DAYS / 2);
  const consumer = resolveConsumerDecision(product);
  const evidenceFootnote = formatPdpEvidenceFootnote({
    spanDays,
    listedStoreCount: storeCount,
    buyableStoreCount,
    chartPointCount: observations,
    eligibleObservations,
    priceChangeCount: consumer?.evidence?.price_change_count,
  });
  const navItems = breadcrumbs.map((c) => ({
    label: c.label,
    href: c.href,
  }));
  const eligibleObs =
    eligibleObservations ??
    consumer?.evidence?.eligible_observations ??
    null;
  const pdpCtx = {
    spanDays,
    eligibleObservations: eligibleObs,
    reason: consumer?.reason,
  };
  const tone = consumer
    ? consumerVerdictTone(consumer.verdict)
    : verdictTone(product.decision?.semaphore);
  const badge = consumer
    ? consumerVerdictBadgeForPdp(consumer.verdict, pdpCtx)
    : verdictBadge(tone);
  const reason =
    verdict.lines.find((l) => l.trim().length > 0) ||
    (consumer ? humanConsumerReason(consumer.reason) : null) ||
    "Com base no histórico observado.";

  return (
    <div className="product-premium">
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10 lg:max-w-7xl">
        <ProductJsonLd product={product} />

        <BreadcrumbNav items={navItems} className="text-sm" />

        <ProductHero product={product} />

        {/* 1. Veredicto */}
        <section
          id="porque"
          aria-labelledby="p34-verdict-heading"
          className="pdp-section"
        >
          <p className="pdp-kicker">Decisão</p>
          <article
            className={`pdp-verdict mt-4 pdp-verdict-${tone}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <span className="pdp-badge">{badge}</span>
              <p className="font-display text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
                {formatEUR(product.currentPrice)}
              </p>
            </div>
            <div className="space-y-3 px-5 py-5 sm:px-6 sm:py-6">
              <h2
                id="p34-verdict-heading"
                className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
              >
                {verdict.title}
              </h2>
              <p className="max-w-2xl text-[15px] leading-relaxed text-slate-600">
                {reason}
              </p>
              {verdict.lines.length > 1 ? (
                <ul className="max-w-2xl space-y-1.5 text-sm text-slate-500">
                  {verdict.lines.slice(1).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {evidenceFootnote ? (
                <p className="pt-1 text-sm text-slate-500">{evidenceFootnote}</p>
              ) : null}
            </div>
          </article>
        </section>

        {/* 3. Histórico — antes das lojas: ver evolução, depois onde comprar */}
        <section
          id="historico"
          className="pdp-section space-y-4"
          aria-labelledby="p34-history-heading"
        >
          <div>
            <p className="pdp-kicker">Histórico</p>
            <h2
              id="p34-history-heading"
              className="mt-2 font-display text-xl font-bold text-slate-900 sm:text-2xl"
            >
              Como o preço evoluiu
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Melhor oferta de cada dia — passa o rato ou toca nos pontos para ver
              o detalhe.
            </p>
          </div>
          <ProductHistoryHint thin={thinHistory} />
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <PriceHistoryChart
              productId={slug}
              currentPrice={product.currentPrice}
              fallbackHistory={product.history}
              hideTitle
            />
          </div>
        </section>

        {/* 4. Lojas */}
        <section
          id="lojas"
          className="pdp-section space-y-4"
          aria-labelledby="p34-stores-heading"
        >
          <div>
            <p className="pdp-kicker">Onde comprar</p>
            <h2
              id="p34-stores-heading"
              className="mt-2 font-display text-xl font-bold text-slate-900 sm:text-2xl"
            >
              Lojas observadas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Preço actual por loja — destacamos onde há stock confirmado.
            </p>
          </div>
          {product.offers?.length ? (
            <StoreCompareTable offers={product.offers} />
          ) : (
            <ProductStoresEmpty />
          )}
        </section>

        {/* 5. Cupões — só se alguma loja do produto tiver campanha/cupão */}
        <ProductCouponsSection product={product} />

        <ProductTelegramStrip className="pdp-telegram" />

        <div className="pdp-section">
          <ProductSimilarSection products={similar} />
        </div>
      </main>
    </div>
  );
}
