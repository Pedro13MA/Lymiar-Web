/**
 * O objetivo do Lymiar — ajudar a comprar no momento certo.
 */
export function HomeEssence() {
  return (
    <section
      id="limiar"
      className="scroll-mt-20 border-b border-slate-200 bg-white"
    >
      <div className="home-fade mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:max-w-7xl lg:py-20">
        <div className="max-w-3xl">
          <p className="home-section-kicker text-sm font-semibold">Porquê o Lymiar</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Comprar no momento certo — não na promoção enganosa
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-slate-600">
            Criámos o Lymiar porque muitas “oportunidades” online são ilusão: a
            loja sobe o preço dias antes, pinta um desconto grande e parece que
            estás a ganhar — quando na realidade pagas igual ou mais.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            O nosso trabalho é cruzar o preço de hoje com o que já observámos —
            com foco no mercado português — e dizer-te, com honestidade, se vale
            a pena comprar agora, se convém esperar — ou se ainda não temos dados
            suficientes.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-500">
            O nome vem de <span className="font-semibold text-slate-800">limiar</span>
            : o ponto em que uma compra deixa de ser só “barata” e passa a valer
            a pena, com base no que o mercado já mostrou. Cupões e campanhas ficam
            à parte — nunca misturamos marketing com o preço observado.
          </p>
        </div>
      </div>
    </section>
  );
}
