"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getMercado,
  type MarketplaceOverview,
  type MarketplaceProductCard,
} from "@/lib/api";
import { MarketProductCard, MarketStat } from "@/components/mercado/MarketCards";
import { WifiLoaderBlock } from "@/components/ui/WifiLoader";
import { formatEUR } from "@/lib/utils";

function RankBlock({
  title,
  items,
}: {
  title: string;
  items?: MarketplaceProductCard[];
}) {
  if (!items?.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.slice(0, 4).map((it) => (
          <MarketProductCard key={`${title}-${it.slug}`} item={it} />
        ))}
      </div>
    </section>
  );
}

export function MercadoDashboardClient() {
  const [data, setData] = useState<MarketplaceOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMercado()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar o mercado.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900">
          Mercado
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Visão factual do catálogo observado — produtos, marcas, lojas e
          actividade. Sem previsões.
        </p>
        <nav className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/mercado/" className="font-medium text-sky-700">
            Dashboard
          </Link>
          <Link href="/mercado/marcas/" className="text-slate-600 hover:text-slate-900">
            Marcas
          </Link>
          <Link href="/mercado/lojas/" className="text-slate-600 hover:text-slate-900">
            Lojas
          </Link>
          <Link
            href="/mercado/tendencias/"
            className="text-slate-600 hover:text-slate-900"
          >
            Tendências
          </Link>
          <Link href="/categorias/" className="text-slate-600 hover:text-slate-900">
            Categorias
          </Link>
        </nav>
      </div>

      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      {!data && !error ? (
        <WifiLoaderBlock text="A carregar" />
      ) : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MarketStat label="Produtos" value={String(data.products)} />
            <MarketStat label="Marcas" value={String(data.brands)} />
            <MarketStat label="Lojas" value={String(data.stores)} />
            <MarketStat label="Categorias" value={String(data.categories)} />
            <MarketStat
              label="Preço médio"
              value={
                data.avgPrice != null ? formatEUR(data.avgPrice) : "—"
              }
            />
            <MarketStat
              label="Promoções"
              value={String(data.promotionsActive)}
            />
            <MarketStat label="Cupões" value={String(data.couponsActive)} />
            <MarketStat
              label="Última sync"
              value={
                (data.lastOfferUpdate || data.lastProductUpdate || "—")
                  .toString()
                  .slice(0, 16)
              }
            />
          </div>

          <RankBlock title="Mais baratos" items={data.rankings?.cheapest} />
          <RankBlock
            title="Maior desconto observado"
            items={data.rankings?.biggestDiscount}
          />
          <RankBlock title="Mais lojas" items={data.rankings?.mostStores} />
          <RankBlock title="Mais recentes" items={data.rankings?.newest} />
        </>
      ) : null}
    </main>
  );
}
