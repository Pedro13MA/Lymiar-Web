import { TELEGRAM_CHANNEL } from "@/lib/constants";
import Link from "next/link";

export function HomeTelegramPremium() {
  return (
    <section className="border-b border-slate-200 bg-slate-900 text-white">
      <div className="home-fade mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:max-w-7xl">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800 via-slate-900 to-[#0f1b2d] p-8 sm:p-10">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--hm-brand)]/25 blur-3xl"
            aria-hidden
          />
          <div className="relative max-w-2xl">
            <p className="text-sm font-semibold text-orange-300">Canal</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Promoções que passam no nosso radar
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Recebe no Telegram apenas o que marca como realmente bom — com
              histórico observado, não descontos inventados. De todas as
              categorias.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={TELEGRAM_CHANNEL}
                target="_blank"
                rel="noopener noreferrer"
                className="home-cta-primary bg-[var(--hm-brand)] hover:bg-[var(--hm-brand-deep)]"
              >
                Abrir canal no Telegram
              </a>
              <Link
                href="/search/"
                className="inline-flex min-h-12 items-center justify-center px-6 text-sm font-semibold text-slate-300 hover:text-white"
              >
                Ou explorar no site →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
