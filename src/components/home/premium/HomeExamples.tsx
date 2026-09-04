"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useHomeDeals } from "@/components/home/premium/HomeDealsProvider";
import { formatEUR } from "@/lib/utils";
import type { DecisionSemaphore, Product } from "@/lib/types";
import { MiniSparkline } from "@/components/home/premium/illustrations";

function looksLikeMerchantPromo(text: string): boolean {
  return /pvpr|preço\s*de\s*venda|promoção\s*imediata|%\s*abaixo\s*do/i.test(
    text,
  );
}

function semaphoreLabel(sem: DecisionSemaphore | undefined): string {
  if (sem === "buy") return "Comprar";
  if (sem === "wait") return "Esperar";
  if (sem === "fair") return "Ainda não sabemos";
  return "Ver evidência";
}

/** Razão honesta — nunca PVPR / “promoção imediata” do merchant. */
function honestReason(p: Product): string {
  const candidates = [
    p.decision.lymiarIndex?.summary,
    p.decision.reason,
    p.decision.bullets?.[0],
  ];
  for (const c of candidates) {
    const t = (c || "").trim();
    if (t && !looksLikeMerchantPromo(t)) return t;
  }

  const min = p.historicalMin;
  const avg = p.avg30d;
  const sem = p.decision.semaphore;

  if (sem === "buy") {
    if (min != null && min > 0 && p.currentPrice <= min * 1.02) {
      return `Perto do mínimo observado (${formatEUR(min)}).`;
    }
    if (avg != null && avg > 0) {
      return `Face à média de 30 dias (${formatEUR(avg)}).`;
    }
    return "Momento favorável face ao histórico observado.";
  }
  if (sem === "wait") {
    if (avg != null && avg > 0) {
      return `Acima do que o histórico recente mostrou (média 30d ${formatEUR(avg)}).`;
    }
    return "O histórico observado sugere esperar.";
  }
  if (min != null || avg != null) {
    return "Há histórico — abre a página para ver a evidência.";
  }
  return "Ainda sem evidência suficiente para um veredicto firme.";
}

function ExampleCard({ p }: { p: Product }) {
  const sem = p.decision.semaphore;
  return (
    <li>
      <Link
        href={`/p/?id=${encodeURIComponent(p.slug)}`}
        className="home-card group block overflow-hidden"
      >
        <div className="flex aspect-square items-center justify-center bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.imageUrl!}
            alt=""
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <div className="border-t border-slate-100 p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-[var(--hm-brand)]">
              {p.name}
            </p>
            <MiniSparkline
              min={p.historicalMin ?? p.currentPrice}
              avg={p.avg30d ?? p.currentPrice}
              current={p.currentPrice}
              max={p.historicalMax ?? p.currentPrice}
              className="h-7 w-11 shrink-0"
            />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <p className="text-lg font-bold text-slate-900">
              {formatEUR(p.currentPrice)}
            </p>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {semaphoreLabel(sem)}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
            {honestReason(p)}
          </p>
        </div>
      </Link>
    </li>
  );
}

function ExampleSkeleton({ id }: { id: string }) {
  return (
    <li key={id}>
      <div className="home-card h-full animate-pulse overflow-hidden">
        <div className="aspect-square bg-slate-100" />
        <div className="space-y-3 border-t border-slate-100 p-5">
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="h-6 w-1/3 rounded bg-slate-100" />
        </div>
      </div>
    </li>
  );
}

export function HomeExamples() {
  const { dealsNow, loading, isPreview } = useHomeDeals();
  const items = useMemo(
    () => dealsNow.filter((p) => p.imageUrl).slice(0, 4),
    [dealsNow],
  );

  // Pré-visualização local ≠ “casos reais” — não fingir.
  if (isPreview) return null;
  if (!items.length && !loading) return null;

  return (
    <section id="exemplos" className="scroll-mt-20 bg-slate-50">
      <div className="home-fade mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl">
        <p className="text-sm font-semibold text-[var(--hm-brand)]">Agora</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Observados neste momento
        </h2>
        <p className="mt-4 max-w-xl text-base text-slate-500">
          Preço actual e leitura face ao histórico — sem comparar a PVPR da loja.
        </p>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.length
            ? items.map((p) => <ExampleCard key={p.ean} p={p} />)
            : Array.from({ length: 4 }).map((_, i) => (
                <ExampleSkeleton key={`ex-${i}`} id={`ex-${i}`} />
              ))}
        </ul>
      </div>
    </section>
  );
}
