"use client";

import { Suspense, useEffect, type ComponentType } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  FolderKanban,
  GitCompare,
  Heart,
  History,
  LineChart,
  List,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import { LoginButton } from "@/components/auth/LoginButton";
import { LoadingAuth } from "@/components/auth/LoadingAuth";
import { useSession } from "@/components/auth/SessionProvider";
import { LymiarLogo } from "@/components/ui/LymiarLogo";
import {
  AlertsPreview,
  ComparePreview,
  FavoritesPreview,
  HistoryPreview,
  ListsPreview,
  ProjectsPreview,
  TimelinePreview,
} from "@/components/auth/entrar-previews";
import "@/components/catalogo/catalog-premium.css";

type Feature = {
  title: string;
  body: string;
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  Preview: ComponentType<{ className?: string }>;
};

const FEATURES: Feature[] = [
  {
    title: "Favoritos",
    body: "Guarda produtos no teu perfil para os seguir ao longo do tempo.",
    Icon: Heart,
    Preview: FavoritesPreview,
  },
  {
    title: "Alertas por email",
    body: "Avisa no teu email Google quando o preço chega ao alvo ou vale a pena comprar.",
    Icon: Bell,
    Preview: AlertsPreview,
  },
  {
    title: "Notificações",
    body: "Quando voltas, vês o que mudou desde a última sessão.",
    Icon: History,
    Preview: TimelinePreview,
  },
  {
    title: "Projetos",
    body: "Organiza builds de PC ou listas de compra complexas.",
    Icon: FolderKanban,
    Preview: ProjectsPreview,
  },
  {
    title: "Listas",
    body: "Agrupa produtos por tema — viagem, escritório ou o que precisares.",
    Icon: List,
    Preview: ListsPreview,
  },
  {
    title: "Comparador",
    body: "Compara vários produtos lado a lado antes de decidir.",
    Icon: GitCompare,
    Preview: ComparePreview,
  },
  {
    title: "Histórico de preços",
    body: "Consulta a evolução observada no catálogo — sem inventar saldos.",
    Icon: LineChart,
    Preview: HistoryPreview,
  },
];

function EntrarInner() {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/minha-area/";

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(next.startsWith("/") ? next : "/minha-area/");
    }
  }, [status, router, next]);

  if (status === "loading" || status === "authenticated") {
    return <LoadingAuth />;
  }

  return (
    <main className="entrar-shell">
      <div className="entrar-grid">
        <section className="entrar-login" aria-labelledby="entrar-title">
          <div className="entrar-login-card catalog-panel">
            <div className="flex items-center gap-3">
              <LymiarLogo size={72} variant="primary" alt="Lymiar" priority />
              <p className="catalog-kicker">Área pessoal</p>
            </div>

            <h1 id="entrar-title" className="entrar-title font-display">
              O Lymiar trabalha por ti, mesmo quando fechas o site.
            </h1>

            <p className="entrar-lead">
              Mais do que uma conta — o teu espaço no Lymiar. Guarda produtos,
              acompanha preços reais, cria projetos, organiza listas, recebe
              alertas e continua exactamente onde paraste em qualquer
              dispositivo.
            </p>

            <ul className="entrar-promise">
              <li>Guarda o que te interessa e acompanha a decisão no tempo</li>
              <li>Alertas por email quando o preço chega ao teu alvo</li>
              <li>Sincroniza favoritos, projetos e listas entre dispositivos</li>
            </ul>

            <LoginButton
              provider="google"
              className="catalog-cta entrar-cta h-12 w-full border-0 text-base shadow-none hover:bg-[var(--hm-brand-deep)]"
            />

            <p className="entrar-footnote">
              Sem password — autenticação com Google. Os dados de preço
              continuam a ser os observados no catálogo; a conta só guarda o que
              é importante para ti.
            </p>
          </div>
        </section>

        <section className="entrar-unlock" aria-labelledby="entrar-unlock-title">
          <div className="entrar-unlock-head">
            <p className="catalog-kicker">O que desbloqueias</p>
            <h2
              id="entrar-unlock-title"
              className="mt-2 font-display text-2xl font-bold tracking-tight text-[var(--hm-ink)] sm:text-3xl"
            >
              A tua área pessoal de compras
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--hm-muted)] sm:text-base">
              Tudo o que precisas para decidir quando comprar, acompanhar preços
              e organizar futuras compras — sincronizado em todos os teus
              dispositivos.
            </p>
          </div>

          <ul className="entrar-features">
            {FEATURES.map(({ title, body, Icon, Preview }) => (
              <li key={title} className="entrar-feature catalog-card">
                <Preview className="entrar-feature-preview" />
                <div className="entrar-feature-body">
                  <div className="flex items-center gap-2.5">
                    <span className="entrar-feature-icon" aria-hidden>
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="font-display text-base font-semibold text-[var(--hm-ink)]">
                      {title}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--hm-muted)]">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

export function EntrarPageClient() {
  return (
    <div className="catalog-premium">
      <SiteHeader />
      <Suspense fallback={<LoadingAuth />}>
        <EntrarInner />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
