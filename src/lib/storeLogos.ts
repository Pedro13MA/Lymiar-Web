/** Logótipos de loja — fonte única para UI (tabela de compra, cupões, etc.). */

export type StoreLogoMeta = {
  slug: string;
  name: string;
  /** Domínio para favicon fallback (Google s2). */
  domain: string;
};

function favicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
}

/** Slugs com asset local em /public/stores/ — PNG/SVG primeiro (marca legível). */
const LOCAL_ASSET: Record<string, string> = {
  worten: "/stores/worten.png",
  globaldata: "/stores/globaldata.png",
  powerplanet: "/stores/powerplanet.png",
  lumories: "/stores/lumories.png",
  padelmarket: "/stores/padelmarket.png",
  enjoythewood: "/stores/enjoythewood.png",
  ottocast: "/stores/ottocast.png",
  ultrahuman: "/stores/ultrahuman.png",
  outin: "/stores/outin.png",
  adidas: "/stores/adidas.png",
  fnac: "/stores/fnac.png",
  pcdiga: "/stores/pcdiga.png",
  "radio-popular": "/stores/radio-popular.png",
  pccomponentes: "/stores/pccomponentes.png",
  allpowers: "/stores/allpowers.png",
  castro: "/stores/castro.png",
};

/** @deprecated use LOCAL_ASSET */
const LOCAL_PNG = new Set(Object.keys(LOCAL_ASSET));

/** Registo central de lojas com logo. */
export const STORE_LOGOS: StoreLogoMeta[] = [
  { slug: "globaldata", name: "Globaldata", domain: "www.globaldata.pt" },
  { slug: "worten", name: "Worten", domain: "www.worten.pt" },
  { slug: "fnac", name: "Fnac", domain: "www.fnac.pt" },
  { slug: "pcdiga", name: "PCDiga", domain: "www.pcdiga.com" },
  { slug: "radio-popular", name: "Rádio Popular", domain: "www.radiopopular.pt" },
  { slug: "pccomponentes", name: "PCComponentes", domain: "www.pccomponentes.pt" },
  { slug: "powerplanet", name: "Powerplanet", domain: "www.powerplanetonline.com" },
  { slug: "padelmarket", name: "Padel Market", domain: "www.padelmarket.com" },
  { slug: "lumories", name: "Lumories", domain: "www.lumories.pt" },
  { slug: "ottocast", name: "Ottocast", domain: "www.ottocast.com" },
  { slug: "enjoythewood", name: "Enjoy the Wood", domain: "www.enjoythewood.com" },
  { slug: "ultrahuman", name: "Ultrahuman", domain: "www.ultrahuman.com" },
  { slug: "outin", name: "OutIn", domain: "outin.com" },
  { slug: "adidas", name: "Adidas", domain: "www.adidas.pt" },
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
  adidaspt: "adidas",
  "adidas pt": "adidas",
  "adidas.pt": "adidas",
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

/** URL do logótipo — asset local → favicon 256. */
export function storeLogoUrl(slugOrName: string): string {
  const meta = getStoreLogoMeta(slugOrName);
  const slug = meta?.slug || normalizeStoreKey(slugOrName);
  if (LOCAL_ASSET[slug]) return LOCAL_ASSET[slug];
  if (LOCAL_PNG.has(slug)) return `/stores/${slug}.png`;
  if (meta) return favicon(meta.domain);
  return favicon("example.com");
}

export function storeDisplayName(slugOrName: string, fallback?: string): string {
  return getStoreLogoMeta(slugOrName)?.name || fallback || slugOrName;
}
