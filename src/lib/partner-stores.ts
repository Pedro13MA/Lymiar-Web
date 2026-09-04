/**
 * Lojas com parceria activa no Lymiar.
 * Fonte alinhada com `spotter-intelligence-hub/src/config/merchants_catalog.py`
 * — apenas merchants com `enabled: true`.
 */

import { storeLogoUrl, storeDisplayName } from "@/lib/coupon-stores";

export type PartnerStore = {
  slug: string;
  name: string;
  logoUrl: string;
  description: string;
  href: string;
};

/** Parceiros ligados — não incluir lojas só planeadas ou sem catálogo observado. */
const CONNECTED: readonly {
  pipelineSlug: string;
  logoSlug: string;
  name: string;
  description: string;
}[] = [
  {
    pipelineSlug: "wortenpt",
    logoSlug: "worten",
    name: "Worten",
    description:
      "Retalhista português de tecnologia, eletrodomésticos e casa — portáteis, TVs, gaming e electrodomésticos.",
  },
  {
    pipelineSlug: "globaldatapt",
    logoSlug: "globaldata",
    name: "Globaldata",
    description:
      "Informática e electrónica em Portugal — PCs, monitores, impressoras e consumíveis.",
  },
  {
    pipelineSlug: "powerplanetpt",
    logoSlug: "powerplanet",
    name: "Powerplanet",
    description:
      "Tecnologia, smartphones e áudio online com entrega em Portugal.",
  },
  {
    pipelineSlug: "lumoriespt",
    logoSlug: "lumories",
    name: "Lumories",
    description:
      "Iluminação para casa e escritório — candeeiros, luzes LED e design.",
  },
  {
    pipelineSlug: "padelmarket",
    logoSlug: "padelmarket",
    name: "Padel Market",
    description:
      "Equipamento de padel — raquetes, bolas, calçado e acessórios.",
  },
  {
    pipelineSlug: "amazonpt",
    logoSlug: "amazon",
    name: "Amazon",
    description:
      "Marketplace com catálogo vasto — comparamos ofertas relevantes para compradores em Portugal.",
  },
  {
    pipelineSlug: "enjoythewood",
    logoSlug: "enjoythewood",
    name: "Enjoy the Wood",
    description:
      "Decoração em madeira e mapas artesanais com envio internacional.",
  },
  {
    pipelineSlug: "ottocast",
    logoSlug: "ottocast",
    name: "Ottocast",
    description:
      "Tecnologia automóvel — adaptadores CarPlay e Android Auto.",
  },
  {
    pipelineSlug: "ultrahuman",
    logoSlug: "ultrahuman",
    name: "Ultrahuman",
    description:
      "Saúde e performance — anéis inteligentes e sensores de bem-estar.",
  },
  {
    pipelineSlug: "outin",
    logoSlug: "outin",
    name: "OutIn",
    description:
      "Café portátil e equipamento outdoor para viagem e campismo.",
  },
];

function mercadoHref(pipelineSlug: string): string {
  return `/mercado/loja/?id=${encodeURIComponent(pipelineSlug)}`;
}

export const PARTNER_STORES: PartnerStore[] = CONNECTED.map((s) => ({
  slug: s.pipelineSlug,
  name: storeDisplayName(s.logoSlug, s.name),
  logoUrl: storeLogoUrl(s.logoSlug),
  description: s.description,
  href: mercadoHref(s.pipelineSlug),
}));
