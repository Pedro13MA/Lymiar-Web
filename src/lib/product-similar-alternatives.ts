/**
 * FASE 8.5.1 — filtrar alternativas leaf-first + família de produto.
 * Não altera Discovery/API ranking; só composição na página de produto.
 */

import type { DiscoveryCard, ProductRecommendations } from "@/lib/product-discovery";
import type { Product } from "@/lib/types";

const ABSURD_RE =
  /\b(adaptador|adapter|carregador|cabo|capa|pel[ií]cula|trotinete|scooter|cafeteira|caf[eé]|aspirador|frigor[ií]fico|microondas|liquidificador|auscultador|auricular|fone|hub usb|powerbank|power bank)\b/i;

const UNUSABLE_LEAF =
  /^(unclassified|non_catalog|unmapped|other|outros|accessory)?$/i;

function fold(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function usableLeaf(raw: string | null | undefined): string {
  const leaf = fold(raw || "");
  if (!leaf || UNUSABLE_LEAF.test(leaf)) return "";
  return leaf;
}

/** Família de produto a partir do nome (iphone, galaxy, rtx 40xx, etc.). */
function productFamily(name: string): string {
  const n = fold(name);
  if (/\biphone\b/.test(n)) return "iphone";
  if (/\b(galaxy\s?s|galaxy\s?z|galaxy\s?a)\b/.test(n) || /\bsamsung\b/.test(n) && /\bgalaxy\b/.test(n))
    return "galaxy";
  if (/\bpixel\b/.test(n)) return "pixel";
  if (/\bredmi\b|\bxiaomi\b/.test(n) && /\b(note|redmi|poco)\b/.test(n)) return "xiaomi_phone";
  if (/\bmacbook\b/.test(n)) return "macbook";
  if (/\brtx\s?50/.test(n)) return "rtx50";
  if (/\brtx\s?40/.test(n)) return "rtx40";
  if (/\brtx\s?30/.test(n)) return "rtx30";
  if (/\b(rx\s?7|radeon)\b/.test(n)) return "radeon";
  if (/\b(990\s?pro|9100|sn850|crucial\s?t700)\b/.test(n) || /\bssd\b/.test(n)) {
    if (/\bnvme|m\.?2|ssd\b/.test(n)) return "ssd";
  }
  if (/\bair\s?fryer\b|\bfritadeira\b/.test(n)) return "air_fryer";
  if (/\bfrigor|\bfridge|\brefrigerador\b/.test(n)) return "fridge";
  return "";
}

function sameFamily(currentName: string, cardName: string): boolean {
  const a = productFamily(currentName);
  const b = productFamily(cardName);
  if (!a) return true; // sem família detectada → não bloquear
  return a === b;
}

function sameCategory(current: Product, card: DiscoveryCard): boolean {
  const curLeaf = usableLeaf(current.leafId);
  const cardLeaf = usableLeaf(card.leafId);
  const curName = current.name || "";
  const cardName = card.name || "";

  if (ABSURD_RE.test(fold(cardName))) return false;

  if (!sameFamily(curName, cardName)) return false;

  if (curLeaf && cardLeaf) {
    return curLeaf === cardLeaf;
  }

  if (curLeaf && !cardLeaf) {
    return false;
  }

  const legacyKey = fold(current.subcategory || current.category || "");
  const name = fold(cardName);
  if (!legacyKey) return !ABSURD_RE.test(name);

  if (legacyKey.includes("smartphone") || legacyKey.includes("telemov")) {
    return /\b(iphone|galaxy|pixel|xiaomi|redmi|huawei|honor|oneplus|oppo|realme|samsung|apple|smartphone|telemovel)\b/i.test(
      name,
    );
  }
  if (legacyKey.includes("motherboard") || legacyKey.includes("placa")) {
    return /\b(motherboard|mainboard|placa.?m[aã]e|b\d{3}|x\d{3}|z\d{3}|b650|b760|x670|z790)\b/i.test(
      name,
    );
  }
  if (legacyKey.includes("gpu") || legacyKey.includes("graf")) {
    return /\b(rtx|gtx|radeon|rx\s?\d|geforce|arc\s?a)\b/i.test(name);
  }
  if (legacyKey.includes("laptop") || legacyKey.includes("portat")) {
    return /\b(port[aá]til|laptop|notebook|macbook)\b/i.test(name);
  }
  if (legacyKey.includes("monitor")) {
    return /\b(monitor|ultrawide|\d{2}["']?\s?(led|oled|ips|va))\b/i.test(name);
  }
  if (legacyKey.includes("ssd") || legacyKey.includes("armazen")) {
    return /\b(ssd|nvme|m\.?2|disco)\b/i.test(name);
  }

  return !ABSURD_RE.test(name);
}

function priceClose(current: number, other: number): boolean {
  if (!(current > 0) || !(other > 0)) return false;
  const lo = current * 0.45;
  const hi = current * 1.75;
  return other >= lo && other <= hi;
}

/**
 * Junta listas da API (já carregadas) e filtra para ≤6 semelhantes reais.
 */
export function pickSimilarAlternatives(
  product: Product,
  recs: ProductRecommendations | null,
  max = 6,
): DiscoveryCard[] {
  if (!recs) return [];

  const pool: DiscoveryCard[] = [];
  const seen = new Set<string>();

  const push = (items: DiscoveryCard[] | null | undefined) => {
    for (const item of items || []) {
      const key = (item.slug || item.ean || item.name || "").toLowerCase();
      if (!key || seen.has(key)) continue;
      if (key === product.slug.toLowerCase()) continue;
      if (ABSURD_RE.test(item.name || "") && !sameFamily(product.name, item.name || "")) {
        continue;
      }
      if (!sameCategory(product, item)) continue;
      if (!priceClose(product.currentPrice, item.currentPrice)) continue;
      seen.add(key);
      pool.push(item);
    }
  };

  push(recs.similar);
  push(recs.alternatives);
  push(recs.savings);
  push(recs.upgrades);
  push(recs.alsoSearched);
  push(recs.recommended);

  return pool
    .sort(
      (a, b) =>
        Math.abs(a.currentPrice - product.currentPrice) -
        Math.abs(b.currentPrice - product.currentPrice),
    )
    .slice(0, max);
}
