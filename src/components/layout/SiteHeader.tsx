"use client";

import Link from "next/link";
import { TELEGRAM_CHANNEL, BRAND_TAGLINE } from "@/lib/constants";
import { CATEGORY_MENU_L1 } from "@/lib/category-slugs";
import { LymiarLogo } from "@/components/ui/LymiarLogo";
import { SiteHeaderP32 } from "@/components/nav/SiteHeaderP32";
import { BottomNavigation } from "@/components/nav/BottomNavigation";


export function SiteHeader() {
  return (
    <>
      <SiteHeaderP32 />
      <BottomNavigation />
    </>
  );
}

export function SiteFooter() {
  const columns = [
    {
      title: "Produto",
      links: [
        { href: "/radar/", label: "Radar" },
        { href: "/categorias/", label: "Categorias" },
        { href: "/catalog/", label: "Explorar" },
        { href: "/comparar/", label: "Comparar" },
      ],
    },
    {
      title: "Minha Área",
      links: [
        { href: "/entrar/", label: "Entrar" },
        { href: "/minha-area/", label: "Minha Área" },
        { href: "/favoritos/", label: "Favoritos" },
      ],
    },
    {
      title: "Categorias",
      links: CATEGORY_MENU_L1.slice(0, 4).map((c) => ({
        href: `/categoria/${c.slug}/`,
        label: c.label,
      })),
    },
    {
      title: "Legal",
      links: [
        { href: "/privacidade/", label: "Privacidade" },
        { href: "/cookies/", label: "Cookies" },
        { href: "/termos/", label: "Termos" },
        { href: "/afiliados/", label: "Afiliados" },
        {
          href: "https://www.livroreclamacoes.pt/Inicio/",
          label: "Reclamações",
          external: true,
        },
        { href: TELEGRAM_CHANNEL, label: "Telegram", external: true },
      ],
    },
  ] as const;

  return (
    <footer className="border-t border-slate-200/60 bg-white pb-16 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between lg:gap-16">
          <div className="max-w-xs shrink-0">
            <LymiarLogo size={48} variant="horizontal" alt="Lymiar" />
            <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
              {BRAND_TAGLINE}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Alguns links para lojas são de afiliado — pode gerar comissão ao
              Lymiar, sem alterar o preço que paga.{" "}
              <Link href="/afiliados/" className="underline hover:text-slate-600">
                Saber mais
              </Link>
            </p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {col.title}
                </p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-slate-600 hover:text-slate-900"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-slate-600 hover:text-slate-900"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-12 text-xs text-slate-400">
          © {new Date().getFullYear()} Lymiar · Preços observados · Sem previsões
          inventadas
        </p>
      </div>
    </footer>
  );
}
