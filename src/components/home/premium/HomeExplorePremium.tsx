"use client";

import Link from "next/link";
import { useState } from "react";
import { PARTNER_STORES } from "@/lib/partner-stores";

function PartnerStoreLogo({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-slate-500 ring-1 ring-slate-200"
        aria-hidden
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt=""
      width={48}
      height={48}
      loading="lazy"
      className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-slate-200"
      onError={() => setFailed(true)}
    />
  );
}

export function HomeExplorePremium() {
  return (
    <section
      id="lojas"
      className="scroll-mt-20 border-b border-slate-200 bg-white"
    >
      <div className="home-fade mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:max-w-7xl lg:py-20">
        <p className="home-section-kicker text-sm font-semibold">Lojas parceiras</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
          Onde o Lymiar compara preços
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
          Trabalhamos com lojas parceiras e estamos sempre a ampliar a rede para
          cobrir o máximo de retalho possível — assim ajudamos a perceber se é o
          momento certo para comprar, loja a loja.
        </p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PARTNER_STORES.map((store) => (
            <li key={store.slug}>
              <Link
                href={store.href}
                className="home-partner-store group flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-orange-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <PartnerStoreLogo name={store.name} logoUrl={store.logoUrl} />
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold text-slate-900">
                      {store.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {store.description}
                    </p>
                  </div>
                </div>
                <span className="mt-4 inline-flex text-sm font-semibold text-[var(--hm-brand)] group-hover:underline">
                  Ver loja no Lymiar →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm text-slate-500">
          <Link
            href="/mercado/lojas/"
            className="font-semibold text-[var(--hm-brand)] hover:underline"
          >
            Ver todas as lojas →
          </Link>
        </p>
      </div>
    </section>
  );
}
