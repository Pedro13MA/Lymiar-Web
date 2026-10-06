/**
 * FASE 7.8 / 7.10 — helpers de conteúdo / specs / FAQ a partir de dados existentes.
 * Nunca inventa especificações técnicas. Nunca mostra "Other" nem texto genérico.
 */

import { canShowCardPriceExtremes } from "@/lib/consumer-decision";
import { displayCategoryLabel, isOtherLabel } from "@/lib/product-display";
import type { Product } from "@/lib/types";

export type SpecRow = { key: string; label: string; value: string };

/** Ordem preferida de atributos por leaf / subcategory. */
const ATTR_ORDER: Record<string, string[]> = {
  gpu: [
    "brand",
    "chipset",
    "vram_gb",
    "memory_type",
    "manufacturer",
    "boost_mhz",
    "base_mhz",
    "memory_bus",
    "pcie",
    "tdp_w",
    "power_w",
    "hdmi",
    "displayport",
    "length_mm",
    "rgb",
    "series",
    "model",
  ],
  laptop: [
    "brand",
    "cpu",
    "processor",
    "ram_gb",
    "memory_gb",
    "capacity_gb",
    "ssd",
    "gpu",
    "screen_size",
    "panel",
    "refresh_rate",
    "weight_kg",
    "resolution",
  ],
  smartphone: [
    "brand",
    "screen_size",
    "processor",
    "ram_gb",
    "capacity_gb",
    "camera",
    "battery_mah",
    "os",
    "refresh_rate",
    "panel",
  ],
  ssd: [
    "brand",
    "capacity_gb",
    "interface",
    "pcie",
    "read_mb_s",
    "write_mb_s",
    "form_factor",
  ],
  cpu: ["brand", "cores", "threads", "socket", "boost_mhz", "tdp_w", "series"],
  monitor: [
    "brand",
    "screen_size",
    "resolution",
    "refresh_rate",
    "panel",
    "hdmi",
    "displayport",
  ],
};

const ATTR_LABELS: Record<string, string> = {
  vram_gb: "VRAM",
  chipset: "Chip",
  manufacturer: "Fabricante",
  boost_mhz: "Boost",
  base_mhz: "Base",
  memory_bus: "Bus memória",
  memory_type: "Memória",
  pcie: "Interface",
  tdp_w: "Consumo (TDP)",
  power_w: "Consumo",
  hdmi: "HDMI",
  displayport: "DisplayPort",
  length_mm: "Comprimento",
  rgb: "RGB",
  series: "Série",
  model: "Modelo",
  cpu: "CPU",
  processor: "Processador",
  ram_gb: "RAM",
  memory_gb: "Memória",
  capacity_gb: "Capacidade",
  ssd: "SSD",
  gpu: "GPU",
  screen_size: "Ecrã",
  panel: "Painel",
  refresh_rate: "Taxa de atualização",
  weight_kg: "Peso",
  resolution: "Resolução",
  camera: "Câmara",
  battery_mah: "Bateria",
  os: "Sistema",
  interface: "Interface",
  read_mb_s: "Leitura",
  write_mb_s: "Escrita",
  form_factor: "Formato",
  cores: "Núcleos",
  threads: "Threads",
  socket: "Socket",
  brand: "Marca",
  color: "Cor",
  storage: "Armazenamento",
};

const UNIT_SUFFIX: Record<string, string> = {
  vram_gb: " GB",
  ram_gb: " GB",
  memory_gb: " GB",
  capacity_gb: " GB",
  tdp_w: " W",
  power_w: " W",
  boost_mhz: " MHz",
  base_mhz: " MHz",
  length_mm: " mm",
  weight_kg: " kg",
  battery_mah: " mAh",
  read_mb_s: " MB/s",
  write_mb_s: " MB/s",
  refresh_rate: " Hz",
  screen_size: '"',
};

function leafKey(product: Product): string {
  return (product.leafId || product.subcategory || "").toLowerCase().trim();
}

export function parseTypedAttributes(
  raw: Record<string, unknown> | string | null | undefined,
): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function formatAttrValue(key: string, value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number" && Number.isFinite(value)) {
    const suffix = UNIT_SUFFIX[key] || "";
    if (key === "pcie" || String(value).includes(".")) {
      return suffix ? `${value}${suffix}` : String(value);
    }
    return `${value}${suffix}`;
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t || isOtherLabel(t)) return null;
    const suffix = UNIT_SUFFIX[key];
    if (suffix && /^\d+(\.\d+)?$/.test(t) && !t.includes(suffix.trim())) {
      return `${t}${suffix}`;
    }
    if (key === "pcie" && /^\d+(\.\d+)?$/.test(t)) return `PCIe ${t}`;
    return t;
  }
  if (Array.isArray(value)) {
    const parts = value.map((v) => formatAttrValue(key, v)).filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }
  return null;
}

export function buildSpecRows(product: Product): SpecRow[] {
  const attrs = {
    ...parseTypedAttributes(product.typedAttributes),
  };
  if (product.chipsetModel && !attrs.chipset) attrs.chipset = product.chipsetModel;
  if (product.vramSpec && !attrs.vram_gb) attrs.vram_gb = product.vramSpec;
  if (product.brand && !attrs.brand) attrs.brand = product.brand;

  const leaf = leafKey(product);
  const order = ATTR_ORDER[leaf] || ATTR_ORDER[leaf.replace(/s$/, "")] || [];
  const keys = [
    ...order.filter((k) => k in attrs),
    ...Object.keys(attrs).filter((k) => !order.includes(k)),
  ];

  const rows: SpecRow[] = [];
  for (const key of keys) {
    const formatted = formatAttrValue(key, attrs[key]);
    if (!formatted) continue;
    rows.push({
      key,
      label: ATTR_LABELS[key] || key.replace(/_/g, " "),
      value: formatted,
    });
  }
  return rows;
}

function attrStr(
  attrs: Record<string, unknown>,
  key: string,
): string | null {
  return formatAttrValue(key, attrs[key]);
}

/**
 * Descrição útil só com dados existentes.
 * Devolve null quando não há matéria suficiente (a UI oculta a secção).
 */
export function buildUsefulDescription(product: Product): string | null {
  const attrs = parseTypedAttributes(product.typedAttributes);
  const brand = (product.brand || "").trim();
  const chip =
    product.chipsetModel?.trim() ||
    attrStr(attrs, "chipset") ||
    attrStr(attrs, "model");
  const vram = product.vramSpec?.trim() || attrStr(attrs, "vram_gb");
  const memType = attrStr(attrs, "memory_type");
  const capacity = attrStr(attrs, "capacity_gb");
  const iface =
    attrStr(attrs, "interface") ||
    (attrs.pcie != null ? formatAttrValue("pcie", attrs.pcie) : null);
  const panel = attrStr(attrs, "panel");
  const os = attrStr(attrs, "os");
  const series = attrStr(attrs, "series");
  const cpu = attrStr(attrs, "cpu") || attrStr(attrs, "processor");
  const ram = attrStr(attrs, "ram_gb") || attrStr(attrs, "memory_gb");
  const screen = attrStr(attrs, "screen_size");
  const leaf = leafKey(product);

  // GPU
  if (leaf === "gpu" || /rtx|gtx|radeon|geforce/i.test(chip || product.name)) {
    if (!chip && !vram) return null;
    const parts: string[] = [];
    parts.push(
      brand
        ? `Placa gráfica ${brand}${chip ? ` ${chip}` : ""}`
        : chip
          ? `Placa gráfica ${chip}`
          : "Placa gráfica",
    );
    if (vram) {
      parts.push(
        `equipada com ${vram}${memType ? ` de memória ${memType}` : " de memória"}`,
      );
    } else if (memType) {
      parts.push(`com memória ${memType}`);
    }
    const sentence = `${parts.join(" ")}, indicada para gaming e criação de conteúdo.`;
    return sentence.replace(/\s+/g, " ").trim();
  }

  // Smartphone
  if (leaf === "smartphone" || /galaxy|iphone|pixel/i.test(product.name)) {
    if (!brand && !panel && !os) return null;
    const bits: string[] = [];
    bits.push(
      brand
        ? `Smartphone ${brand}${series ? ` da gama ${series}` : ""}`
        : "Smartphone",
    );
    const feats: string[] = [];
    if (panel) feats.push(`ecrã ${panel}`);
    if (screen) feats.push(`diagonal ${screen}`);
    if (os) {
      feats.push(
        /android/i.test(os)
          ? "sistema Android"
          : /ios|iphone/i.test(os)
            ? "sistema iOS"
            : `sistema ${os}`,
      );
    }
    if (/5g/i.test(product.name) || /5g/i.test(String(attrs.connectivity || ""))) {
      feats.push("conectividade 5G");
    }
    if (!feats.length && !brand) return null;
    return `${bits.join("")}${feats.length ? ` com ${feats.join(", ")}` : ""}.`
      .replace(/\s+/g, " ")
      .trim();
  }

  // SSD
  if (leaf === "ssd" || /nvme|ssd/i.test(product.name)) {
    if (!capacity && !iface) return null;
    const bits: string[] = [];
    bits.push(brand ? `SSD ${brand}` : "SSD");
    if (iface) bits.push(iface.includes("NVMe") || iface.includes("PCIe") ? iface : `NVMe ${iface}`);
    else if (/nvme/i.test(product.name)) bits.push("NVMe");
    if (capacity) bits.push(`de ${capacity}`);
    return `${bits.join(" ")} para computadores portáteis e desktops, indicado para acelerar arranque e carregamento de aplicações.`
      .replace(/\s+/g, " ")
      .trim();
  }

  // Laptop
  if (leaf === "laptop" || leaf === "notebook") {
    if (!cpu && !ram && !brand) return null;
    const feats: string[] = [];
    if (cpu) feats.push(cpu);
    if (ram) feats.push(`${ram} de RAM`);
    if (screen) feats.push(`ecrã ${screen}`);
    return `${brand ? `Portátil ${brand}` : "Portátil"}${
      feats.length ? ` com ${feats.join(", ")}` : ""
    }.`
      .replace(/\s+/g, " ")
      .trim();
  }

  // Monitor
  if (leaf === "monitor") {
    if (!screen && !panel && !attrStr(attrs, "resolution")) return null;
    const feats: string[] = [];
    if (screen) feats.push(screen);
    if (panel) feats.push(panel);
    const res = attrStr(attrs, "resolution");
    if (res) feats.push(res);
    const hz = attrStr(attrs, "refresh_rate");
    if (hz) feats.push(hz);
    return `${brand ? `Monitor ${brand}` : "Monitor"}${
      feats.length ? ` ${feats.join(", ")}` : ""
    }.`
      .replace(/\s+/g, " ")
      .trim();
  }

  // Generic — only if we have ≥2 real specs
  const specs = buildSpecRows(product);
  const useful = specs.filter((s) => s.key !== "brand");
  if (useful.length < 2) return null;
  const cat =
    displayCategoryLabel(
      product.leafId?.replace(/_/g, " "),
      product.subcategoryLabel,
    ) || "produto";
  const highlight = useful
    .slice(0, 3)
    .map((s) => `${s.label.toLowerCase()} ${s.value}`)
    .join(", ");
  return `${brand ? `${brand} ` : ""}${cat} com ${highlight}.`
    .replace(/\s+/g, " ")
    .trim();
}

export function buildAutoDescription(product: Product): {
  summary: string | null;
  features: string[];
  benefits: string[];
} {
  const summary = buildUsefulDescription(product);
  const specs = buildSpecRows(product);
  const features = specs.slice(0, 6).map((s) => `${s.label}: ${s.value}`);

  const benefits: string[] = [];
  if (product.offers.length > 1) {
    benefits.push(`Disponível em ${product.offers.length} lojas observadas.`);
  }
  if (canShowCardPriceExtremes(product) && product.decision.isHistoricalMin) {
    benefits.push("Preço atual próximo do mínimo histórico observado.");
  }
  if (product.storeCouponsAvailable) {
    benefits.push("Há cupões ou campanhas informativas associadas a lojas.");
  }

  return { summary, features, benefits };
}

export type ProductFaqItem = { question: string; answer: string };

export function buildProductFaq(product: Product): ProductFaqItem[] {
  const condition = (product.condition || "NEW").toUpperCase();
  const conditionLabel =
    condition === "NEW"
      ? "novo"
      : condition === "OPEN_BOX"
        ? "caixa aberta"
        : condition === "OUTLET"
          ? "outlet"
          : condition === "REFURBISHED"
            ? "recondicionado"
            : condition.toLowerCase();

  const stores = product.offers
    .map((o) => o.storeName || o.store)
    .filter(Boolean)
    .slice(0, 6);

  const items: ProductFaqItem[] = [];

  if (product.condition) {
    items.push({
      question: "Este produto é novo?",
      answer:
        condition === "NEW"
          ? "O estado observado no Lymiar é Novo, com base nos dados das lojas."
          : `O estado observado é «${conditionLabel}». Confirma sempre na página da loja antes de comprar.`,
    });
  }

  if (
    canShowCardPriceExtremes(product) &&
    product.historicalMin != null &&
    product.historicalMin > 0
  ) {
    items.push({
      question: "Qual o preço mais baixo observado?",
      answer: `O mínimo histórico registado no Lymiar é ${product.historicalMin.toFixed(2)} € (dados observados, sem previsões).`,
    });
  }

  if (stores.length) {
    items.push({
      question: "Em que lojas está disponível?",
      answer: `Lojas com oferta observada: ${stores.join(", ")}.`,
    });
  }

  if (product.history.length >= 5) {
    items.push({
      question: "Quando costuma baixar?",
      answer:
        "O Lymiar não prevê descidas futuras. Usa o gráfico de histórico e o veredicto nesta página para ver se o momento atual é favorável face ao passado observado.",
    });
  }

  // Garantia — só se houver condição conhecida (resposta contextual)
  if (product.condition) {
    items.push({
      question: "Tem garantia?",
      answer:
        "A garantia depende da loja e do estado do produto. Consulta os termos na página do retalhista antes de concluir a compra.",
    });
  }

  return items.filter((i) => i.answer.trim().length > 0);
}

export function collectImageUrls(product: Product): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const push = (u?: string | null) => {
    if (!u || seen.has(u)) return;
    seen.add(u);
    urls.push(u);
  };
  for (const u of product.imageUrls || []) push(u);
  push(product.imageUrl);
  // Qualquer loja com foto — fallback se a galeria canónica veio vazia ou incompleta.
  for (const offer of product.offers || []) {
    push(offer.imageUrl);
  }
  // Preferir imageUrl canónico no topo se existir.
  if (product.imageUrl && urls[0] !== product.imageUrl && seen.has(product.imageUrl)) {
    const rest = urls.filter((u) => u !== product.imageUrl);
    return [product.imageUrl, ...rest];
  }
  return urls;
}
