import Link from "next/link";

type PillarTone = "buy" | "wait" | "unknown";

type StoryStep = {
  label: string;
  detail: string;
  highlight?: boolean;
};

type Pillar = {
  tone: PillarTone;
  title: string;
  why: string;
  exampleIntro: string;
  steps: StoryStep[];
  takeaway: string;
  cta: string;
  href: string;
};

const PILLARS: Pillar[] = [
  {
    tone: "buy",
    title: "Vale a pena comprar",
    why:
      "Quando o preço de hoje está dentro ou abaixo do que já observámos no mercado — não é etiqueta de “promoção”, é evidência de histórico.",
    exampleIntro: "Gráfica RTX 5070 (exemplo fictício)",
    steps: [
      {
        label: "Histórico observado",
        detail: "A gráfica costuma estar à volta de 1 100 €.",
      },
      {
        label: "O que mudou",
        detail: "A loja baixa para 1 000 € sem jogar com o preço antes.",
        highlight: true,
      },
      {
        label: "O que o Lymiar diz",
        detail: "Vale a pena comprar — é um preço que já vimos ser melhor.",
      },
      {
        label: "Promoção falsa (contraste)",
        detail:
          "Uma semana depois a loja sobe a 1 300 € e “desconta” para 1 100 €. Parece saldo, mas é o preço habitual.",
      },
    ],
    takeaway:
      "Comprar quando o preço é realmente bom face ao histórico — não quando a loja inventa um desconto.",
    cta: "Ver oportunidades agora",
    href: "/catalog/?section=deals",
  },
  {
    tone: "wait",
    title: "Melhor esperar",
    why:
      "Quando o preço está alto face ao habitual, a “promoção” não compensa, ou há padrão sazonal que sugere melhor momento.",
    exampleIntro: "SSD 1 TB (exemplo fictício)",
    steps: [
      {
        label: "Histórico observado",
        detail: "O disco costuma estar à volta de 70 €.",
      },
      {
        label: "Padrão sazonal",
        detail: "Em novembro, já vimos baixar para perto de 60 €.",
        highlight: true,
      },
      {
        label: "O que o Lymiar diz",
        detail:
          "Se tens pressa e precisas agora, compra. Se podes aguardar, provavelmente compensa esperar.",
      },
    ],
    takeaway:
      "Esperar não é castigo — é evitar pagar mais quando o calendário do mercado já mostrou melhores dias.",
    cta: "Ver produtos a evitar agora",
    href: "/catalog/?section=overpriced",
  },
  {
    tone: "unknown",
    title: "Ainda não sabemos",
    why:
      "Quando ainda não temos observações suficientes para um veredicto honesto. Preferimos admitir o limite a inventar certeza.",
    exampleIntro: "Produto novo no radar (exemplo fictício)",
    steps: [
      {
        label: "Situação",
        detail: "Acabámos de começar a observar o produto — poucos dias de histórico.",
      },
      {
        label: "O que falta",
        detail:
          "Sem série de preços estável, não sabemos se 89 € é bom, mau ou neutro.",
        highlight: true,
      },
      {
        label: "O que o Lymiar diz",
        detail:
          "Ainda não sabemos. O critério de compra desta vez fica pela tua escolha — comparamos lojas, mas não forçamos um veredicto.",
      },
    ],
    takeaway:
      "Honestidade antes de marketing: sem dados, não fingimos que sabemos.",
    cta: "Explorar produtos",
    href: "/catalog/",
  },
];

function toneSurface(tone: PillarTone): string {
  if (tone === "buy")
    return "border-[var(--verdict-buy-border)]/90 bg-[var(--hm-buy-soft)]";
  if (tone === "wait")
    return "border-[var(--verdict-wait-border)]/90 bg-[var(--hm-wait-soft)]";
  return "border-[var(--verdict-unknown-border)]/90 bg-[var(--hm-unknown-soft)]";
}

function toneBadge(tone: PillarTone): string {
  if (tone === "buy") return "bg-[var(--hm-buy)] text-white";
  if (tone === "wait") return "bg-[var(--hm-wait)] text-white";
  return "bg-[var(--hm-unknown)] text-[#1a1500]";
}

export function HomeDecisionsPremium() {
  return (
    <section
      id="decisoes"
      className="scroll-mt-20 border-b border-[var(--hm-line)] bg-[var(--hm-bg-elevated)]"
    >
      <div className="home-fade mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:max-w-7xl lg:py-20">
        <p className="home-section-kicker text-sm font-semibold">Como funciona</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[var(--hm-ink)] sm:text-4xl">
          Como o Lymiar trabalha
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--hm-muted)]">
          Observamos preços ao longo do tempo e respondemos com três veredictos
          principais. Na página do produto há mais contexto — stock, confiança da
          amostra, histórico — mas o princípio é sempre este:
        </p>

        <ul className="mt-10 grid gap-6 lg:grid-cols-3 lg:gap-5">
          {PILLARS.map((pillar) => (
            <li
              key={pillar.tone}
              className={`home-decision-pillar home-card flex flex-col border p-5 sm:p-6 ${toneSurface(pillar.tone)}`}
            >
              <span
                className={`inline-flex self-start rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${toneBadge(pillar.tone)}`}
              >
                {pillar.title}
              </span>

              <p className="mt-4 text-sm leading-relaxed text-[var(--hm-muted)]">
                <span className="font-semibold text-[var(--hm-ink)]">Porquê? </span>
                {pillar.why}
              </p>

              <div className="home-decision-story mt-5 rounded-xl border border-[var(--hm-line)] bg-[var(--hm-bg-elevated)]/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hm-faint)]">
                  Exemplo ilustrativo
                </p>
                <p className="mt-1 font-display text-sm font-semibold text-[var(--hm-ink)]">
                  {pillar.exampleIntro}
                </p>
                <ol className="mt-3 space-y-3">
                  {pillar.steps.map((step) => (
                    <li
                      key={step.label}
                      className={`home-decision-story-step text-sm leading-relaxed ${
                        step.highlight
                          ? "rounded-lg border border-[var(--hm-brand)]/30 bg-[var(--hm-brand-soft)] px-3 py-2 text-[var(--hm-ink)]"
                          : "text-[var(--hm-muted)]"
                      }`}
                    >
                      <span className="font-semibold text-[var(--hm-ink)]">
                        {step.label}.{" "}
                      </span>
                      {step.detail}
                    </li>
                  ))}
                </ol>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[var(--hm-muted)]">
                {pillar.takeaway}
              </p>

              <Link
                href={pillar.href}
                className="mt-5 inline-flex text-sm font-semibold text-[var(--hm-brand)] hover:underline"
              >
                {pillar.cta} →
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-[var(--hm-faint)]">
          Os exemplos são fictícios para ilustrar a lógica. Nos produtos reais,
          o veredicto vem do histórico que observámos — e é o mesmo na listagem e
          na página do produto.
        </p>
      </div>
    </section>
  );
}
