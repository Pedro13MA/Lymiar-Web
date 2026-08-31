"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchPriceHistory,
  type HistoryGranularity,
  type PriceHistoryOut,
} from "@/lib/api";
import type { PricePoint } from "@/lib/types";
import {
  PriceHistoryChart as Chart,
  type ChartPoint,
} from "@/components/charts/PriceHistoryChart";
import {
  bestPriceExtremes,
  fillPeriodWindow,
} from "@/lib/price-history-chart";
import { cn, formatEUR } from "@/lib/utils";

const PERIODS = [
  { days: 7, label: "1 semana" },
  { days: 14, label: "2 semanas" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
  { days: 365, label: "1 ano" },
  { days: 730, label: "2 anos" },
  { days: 1095, label: "3 anos" },
] as const;

type PeriodDays = (typeof PERIODS)[number]["days"];

type Props = {
  productId: string;
  currentPrice: number;
  /** Só usado se /history falhar — nunca merge cego com a série API. */
  fallbackHistory?: PricePoint[];
  hideTitle?: boolean;
};

function ChartSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-80 w-full animate-pulse rounded-xl bg-slate-100 sm:h-96" />
    </div>
  );
}

function autoGranularity(days: number): HistoryGranularity {
  return days > 90 ? "weekly" : "daily";
}

function SummaryCard({
  tone,
  label,
  value,
}: {
  tone: "current" | "min" | "max";
  label: string;
  value: number;
}) {
  const dot =
    tone === "current"
      ? "bg-orange-600"
      : tone === "min"
        ? "bg-emerald-600"
        : "bg-rose-700";

  return (
    <li className="rounded-2xl border border-slate-200/70 bg-white px-3.5 py-3">
      <p className="flex items-center gap-2 text-xs font-medium text-slate-600">
        <span className={cn("h-2.5 w-2.5 rounded-full", dot)} aria-hidden />
        {label}
      </p>
      <p className="mt-1.5 font-display text-lg font-bold tabular-nums text-slate-900">
        {formatEUR(value)}
      </p>
    </li>
  );
}

function pickDefaultPeriod(fallbackLen: number): PeriodDays {
  if (fallbackLen >= 60) return 90;
  if (fallbackLen >= 20) return 30;
  if (fallbackLen >= 10) return 14;
  return 7;
}

/** Série API: price = melhor oferta; maxPrice = tecto de mercado (só banda). */
function toChartPoints(
  raw: PriceHistoryOut["points"] | null | undefined,
): ChartPoint[] {
  if (!raw?.length) return [];
  return raw
    .filter((p) => p.price > 0 && p.date)
    .map((p) => ({
      date: String(p.date).slice(0, 10),
      price: p.price,
      maxMarketPrice:
        p.maxPrice != null && p.maxPrice > p.price ? p.maxPrice : null,
      isImputed: false,
    }));
}

function fallbackToChart(points: PricePoint[]): ChartPoint[] {
  return points
    .filter((p) => p.price > 0 && p.date)
    .map((p) => ({
      date: String(p.date).slice(0, 10),
      price: p.price,
      maxMarketPrice: null,
      isImputed: false,
    }));
}

export function PriceHistoryChart({
  productId,
  currentPrice,
  fallbackHistory = [],
  hideTitle = false,
}: Props) {
  const [days, setDays] = useState<PeriodDays>(() =>
    pickDefaultPeriod(fallbackHistory.length),
  );
  const [data, setData] = useState<PriceHistoryOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const granularity = autoGranularity(days);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPriceHistory(productId, days, granularity)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "Erro ao carregar histórico");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, days, granularity]);

  const points = useMemo(() => {
    const apiPoints = toChartPoints(data?.points);
    // Sem merge com detail.history: só fallback se a API não trouxe série.
    const base =
      apiPoints.length > 0 ? apiPoints : fallbackToChart(fallbackHistory);
    return fillPeriodWindow(base, days, currentPrice);
  }, [data, fallbackHistory, days, currentPrice]);

  const extremes = useMemo(() => bestPriceExtremes(points), [points]);

  // Cards / marcadores: só Melhor Oferta no período (nunca spread nem stats cross-store).
  const safeMin = extremes.min ?? currentPrice;
  const safeMax = extremes.max ?? currentPrice;
  const displayCurrent =
    points.length && points[points.length - 1].price > 0
      ? points[points.length - 1].price
      : currentPrice;

  const canChart = points.length >= 2;
  const showMaxCard = safeMax > safeMin + 0.05;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {!hideTitle ? (
          <h2 className="font-display text-xl font-bold text-slate-900">
            Histórico de preço
          </h2>
        ) : (
          <span className="sr-only">Histórico de preço</span>
        )}
        <div
          className={cn(
            "flex gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1 snap-x snap-mandatory scrollbar-thin",
            hideTitle && "sm:ml-auto",
          )}
          role="group"
          aria-label="Período do gráfico"
        >
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setDays(p.days)}
              className={cn(
                "inline-flex min-h-10 shrink-0 snap-start items-center justify-center rounded-lg px-3 text-xs font-medium transition-colors",
                days === p.days
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                  : "text-slate-500 hover:bg-white/60 hover:text-slate-800",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <ChartSkeleton /> : null}

      {!loading && canChart ? (
        <>
          <Chart
            history={points}
            currentPrice={displayCurrent}
            historicalMin={safeMin}
            historicalMax={safeMax}
            minDate={extremes.minDate}
            maxDate={extremes.maxDate}
          />
          <ul
            className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"
            aria-label="Legenda do gráfico"
          >
            <li className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full bg-[#e2550f]"
                aria-hidden
              />
              Melhor oferta do dia
            </li>
            <li className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full bg-emerald-600"
                aria-hidden
              />
              Mínimo no período
            </li>
            <li className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full bg-rose-700"
                aria-hidden
              />
              Máximo no período
            </li>
            <li className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-sm bg-orange-200/80"
                aria-hidden
              />
              Outras lojas (faixa)
            </li>
          </ul>
          <ul className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              tone="current"
              label="Melhor oferta atual"
              value={displayCurrent}
            />
            <SummaryCard
              tone="min"
              label="Mínimo (melhor oferta)"
              value={safeMin}
            />
            <SummaryCard
              tone="max"
              label={
                showMaxCard
                  ? "Máximo (melhor oferta)"
                  : "Máximo (sem variação)"
              }
              value={safeMax}
            />
          </ul>
          <p className="text-xs leading-relaxed text-slate-500">
            A linha mostra a loja mais barata em cada dia. A faixa clara indica
            outras lojas no mesmo dia — não entra no mínimo/máximo. Dias sem nova
            observação mantêm o último preço (carry-forward).
          </p>
        </>
      ) : null}

      {!loading && !canChart ? (
        <p className="py-12 text-center text-sm text-slate-500">
          {error
            ? "Não foi possível carregar o histórico para este período."
            : "Histórico insuficiente para o gráfico."}
        </p>
      ) : null}
    </div>
  );
}
