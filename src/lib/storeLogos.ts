/** Logótipos de loja — fonte única para UI (tabela de compra, cupões, etc.). */

export type StoreLogoMeta = {
  slug: string;
  name: string;
  /** Domínio para favicon (Google s2). */
  domain: string;
};

function favicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/** Registo central de lojas com logo. */
export const STORE_LOGOS: StoreLogoMeta[] = [
  { slug: "globaldata", name: "Globaldata", domain: "www.globaldata.pt" },
  { slug: "worten", name: "Worten", domain: "www.worten.pt" },
  { slug: "fnac", name: "Fnac", domain: "www.fnac.pt" },
  { slug: "pcdiga", name: "PCDiga", domain: "www.pcdiga.com" },
  { slug: "amazon", name: "Amazon", domain: "www.amazon.es" },
  { slug: "radio-popular", name: "Rádio Popular", domain: "www.radiopopular.pt" },
  { slug: "pccomponentes", name: "PCComponentes", domain: "www.pccomponentes.pt" },
  { slug: "powerplanet", name: "Powerplanet", domain: "www.powerplanetonline.com" },
  { slug: "padelmarket", name: "Padel Market", domain: "www.padelmarket.com" },
  { slug: "lumories", name: "Lumories", domain: "www.lumories.pt" },
  { slug: "ottocast", name: "Ottocast", domain: "www.ottocast.com" },
  { slug: "enjoythewood", name: "Enjoy the Wood", domain: "www.enjoythewood.com" },
  { slug: "ultrahuman", name: "Ultrahuman", domain: "www.ultrahuman.com" },
  { slug: "outin", name: "OutIn", domain: "outin.com" },
  { slug: "allpowers", name: "ALLPOWERS", domain: "www.allpowers.com" },
  { slug: "castro", name: "Castro Electrónica", domain: "www.castroelectronica.pt" },
  { slug: "switch", name: "Switch Technology", domain: "www.switch.pt" },
];

const ALIASES: Record<string, string> = {
  "radio popular": "radio-popular",
  radiopopular: "radio-popular",
  "rádio popular": "radio-popular",
  pc_diga: "pcdiga",
  "pc diga": "pcdiga",
  pccomponentes_pt: "pccomponentes",
  "pc componentes": "pccomponentes",
  amazon_es: "amazon",
  amazon_pt: "amazon",
  global_data: "globaldata",
  wortenpt: "worten",
  "worten pt": "worten",
  globaldatapt: "globaldata",
  "globaldata pt": "globaldata",
  powerplanetpt: "powerplanet",
  "power planet": "powerplanet",
  padelmarketpt: "padelmarket",
  "padel market": "padelmarket",
  fnacpt: "fnac",
  "fnac pt": "fnac",
  lumoriespt: "lumories",
  "lumories pt": "lumories",
  enjoythewood: "enjoythewood",
  lighting: "enjoythewood",
  ottocastpt: "ottocast",
};

function normalizeStoreKey(raw: string): string {
  const key = (raw || "").trim().toLowerCase();
  return ALIASES[key] || key.replace(/\s+/g, "-");
}

export function getStoreLogoMeta(slugOrName: string): StoreLogoMeta | undefined {
  const key = normalizeStoreKey(slugOrName);
  return (
    STORE_LOGOS.find((s) => s.slug === key) ||
    STORE_LOGOS.find((s) => s.name.toLowerCase() === key) ||
    STORE_LOGOS.find((s) => key.includes(s.slug) || s.slug.includes(key))
  );
}

/** URL do logótipo (favicon estável). Sempre devolve string utilizável. */
export function storeLogoUrl(slugOrName: string): string {
  const meta = getStoreLogoMeta(slugOrName);
  if (meta) return favicon(meta.domain);
  // Fallback genérico — iniciais no componente se falhar o load
  return favicon("example.com");
}

export function storeDisplayName(slugOrName: string, fallback?: string): string {
  return getStoreLogoMeta(slugOrName)?.name || fallback || slugOrName;
}
