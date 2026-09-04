"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useHomeDeals } from "@/components/home/premium/HomeDealsProvider";
import { HomeSearchBar } from "@/components/home/premium/HomeSearchBar";
import { HomeRadarCarousel } from "@/components/home/premium/HomeRadarCarousel";
import {
  pickRadarProducts,
  RADAR_PRODUCT_LIMIT,
} from "@/components/home/premium/home-verdict-picks";

const EXPLORE = [
  { href: "/categoria/gaming/", label: "Gaming" },
  { href: "/categoria/telemoveis/", label: "Telemóveis" },
  { href: "/categoria/informatica/", label: "Informática" },
  { href: "/categoria/casa/", label: "Casa" },
  { href: "/categoria/tv_audio/", label: "TV e Áudio" },
  { href: "/categoria/fotografia/", label: "Fotografia" },
] as const;

export function HomeHeroPremium() {
  const { dealsNow, loading } = useHomeDeals();

  const radarProducts = useMemo(
    () => pickRadarProducts(dealsNow, RADAR_PRODUCT_LIMIT),
    [dealsNow],
  );

  return (
    <section className="home-hero border-b border-white/5">
      <div className="home-hero-aurora home-hero-aurora--coral" aria-hidden />
      <div className="home-hero-aurora home-hero-aurora--mint" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:max-w-7xl lg:py-16">
        <div className="home-fade mx-auto max-w-4xl text-center">
          <h1 className="font-display text-[clamp(2rem,5.5vw,3.35rem)] font-bold leading-[1.08] tracking-tight text-white">
            <span className="home-hero-brand">Lymiar</span>
            <span className="mt-1 block text-white/95">Vale a pena comprar agora?</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Observamos preços com foco no mercado português e dizemos com
            honestidade se é boa compra, se convém esperar — ou se ainda não
            temos histórico suficiente.
          </p>

          <div className="home-fade-delay mx-auto mt-8 max-w-2xl">
            <HomeSearchBar autoFocus />
          </div>

          <div className="home-fade-delay-2 mt-5 flex flex-wrap items-center justify-center gap-2">
            {EXPLORE.map(({ href, label }) => (
              <Link key={href} href={href} className="home-explore-chip">
                {label}
              </Link>
            ))}
            <Link href="/categorias/" className="home-explore-link text-sm font-semibold">
              Todas →
            </Link>
          </div>

          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="#decisoes" className="home-cta-ghost">Como funciona</Link>
          </div>
        </div>

        <div className="home-fade-delay-2 mt-12 border-t border-white/10 pt-10">
          <div className="mb-5 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Agora no radar
            </p>
            <Link
              href="/search/"
              className="text-xs font-semibold text-orange-300 hover:text-orange-200"
            >
              Ver tudo →
            </Link>
          </div>
          <HomeRadarCarousel products={radarProducts} loading={loading} />
        </div>
      </div>
    </section>
  );
}
