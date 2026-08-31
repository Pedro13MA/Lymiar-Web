"use client";

import {
  consumerConfidencePct,
  consumerVerdictBadge,
  resolveConsumerDecision,
} from "@/lib/consumer-decision";
import {
  resolveProductInsights,
  type InsightTone,
} from "@/lib/product-insights-buying";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { product: Product };

function toneDot(tone: InsightTone): string {
  if (tone === "good") return "bg-emerald-500";
  if (tone === "caution") return "bg-amber-400";
  return "bg-slate-300";
}

function Stars({ n }: { n: number }) {
  return (
    <span className="tracking-tight text-amber-500" aria-label={`${n} de 5`}>
      {"★".repeat(n)}
      <span className="text-slate-300">{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}

/**
 * FASE 7.16 — Insights Lymiar (só interpretação factual).
 */
export function ProductInsightsSection({ product }: Props) {
  const insights = resolveProductInsights(product);
  const consumer = resolveConsumerDecision(product);
  const headlineLabel = consumer
    ? consumerVerdictBadge(consumer.verdict)
    : insights.recommendationLabel;
  const headlineConfidence = consumer
    ? consumerConfidencePct(consumer)
    : insights.confidence;

  return (
    <section id="insights" className="scroll-mt-20 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Insights Lymiar
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Leitura factual dos dados observados — sem previsões.
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold text-slate-800">{headlineLabel}</p>
          <p className="text-xs text-slate-400">
            Confiança {headlineConfidence}%
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span className="font-medium text-slate-500">Qualidade dos dados</span>
        <Stars n={insights.dataQuality} />
        {insights.evidence ? (
          <span className="text-xs text-slate-400">
            {insights.evidence.historyPoints ?? 0} pontos ·{" "}
            {insights.evidence.storeCount ?? 0} lojas
            {insights.evidence.spanDays
              ? ` · ${insights.evidence.spanDays} dias`
              : ""}
          </span>
        ) : null}
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {insights.cards.map((c) => (
          <li
            key={c.id}
            className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5"
          >
            <span
              className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", toneDot(c.tone))}
              aria-hidden
            />
            <span className="text-sm font-medium text-slate-800">{c.label}</span>
          </li>
        ))}
      </ul>

      {insights.summary.length ? (
        <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          {insights.summary.map((line) => (
            <p key={line} className="text-sm text-slate-700">
              {line}
            </p>
          ))}
        </div>
      ) : null}

      {(insights.pros.length > 0 || insights.cons.length > 0) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {insights.pros.length ? (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Vantagens</h3>
              <ul className="mt-2 space-y-1">
                {insights.pros.map((p) => (
                  <li key={p} className="text-sm text-emerald-800">
                    · {p}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {insights.cons.length ? (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                Desvantagens
              </h3>
              <ul className="mt-2 space-y-1">
                {insights.cons.map((c) => (
                  <li key={c} className="text-sm text-slate-600">
                    · {c}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {insights.timeline.length ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Timeline
          </h3>
          <ol className="relative space-y-0 border-l border-slate-200 pl-4">
            {insights.timeline.map((ev, idx) => (
              <li key={`${ev.id}-${idx}`} className="relative pb-5 last:pb-0">
                <span className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-sky-500 bg-white" />
                <p className="text-sm font-medium text-slate-900">{ev.label}</p>
                <p className="text-xs text-slate-500">
                  {ev.date}
                  {ev.detail ? ` · ${ev.detail}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
