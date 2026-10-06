import type { Promotion } from "@/lib/types";
import { getCouponStoreMeta, storeDisplayName } from "@/lib/coupon-stores";

/** Normaliza slug de loja para filtros do hub. */
export function normalizeCouponStoreSlug(slug: string): string {
  const s = (slug || "").trim().toLowerCase();
  if (s.startsWith("worten")) return "worten";
  if (s.startsWith("globaldata")) return "globaldata";
  if (s.startsWith("powerplanet")) return "powerplanet";
  if (s.startsWith("adidas")) return "adidas";
  if (s.startsWith("fnac")) return "fnac";
  if (s.startsWith("pccomponentes")) return "pccomponentes";
  if (s.startsWith("lumories")) return "lumories";
  if (s.startsWith("ottocast")) return "ottocast";
  if (s.startsWith("amazon")) return "other";
  return s;
}

export function formatCouponDiscount(promo: Promotion): string | null {
  if (promo.discountKind === "percent" && promo.discountValue != null) {
    return `${promo.discountValue}%`;
  }
  if (promo.discountKind === "amount" && promo.discountValue != null) {
    return `${promo.discountValue}€`;
  }
  return null;
}

/** Refs internas Awin (ex: "DSI | Julho 2026") — não são o título comercial. */
export function looksLikeInternalCampaignRef(title: string | null | undefined): boolean {
  const t = (title || "").trim();
  if (!t) return false;
  if (t.includes("|")) return true;
  return /^[A-Z0-9][A-Z0-9._\-]{1,14}$/.test(t) && !/\d+%/.test(t);
}

/**
 * Título principal do card: descrição comercial quando o title Awin é ref interna.
 * Devolve também a ref para subtítulo.
 */
export function resolveCouponDisplayTitle(promo: Promotion): {
  title: string;
  campaignRef: string | null;
} {
  const apiRef = promo.campaignRef?.trim() || null;
  const rawTitle = promo.title?.trim() || "";
  const rawDesc = promo.description?.trim() || "";

  if (apiRef && rawTitle) {
    return { title: rawTitle, campaignRef: apiRef };
  }

  if (
    rawTitle &&
    rawDesc &&
    rawDesc.toLowerCase() !== rawTitle.toLowerCase() &&
    looksLikeInternalCampaignRef(rawTitle)
  ) {
    return { title: rawDesc, campaignRef: rawTitle };
  }

  if (rawTitle) return { title: rawTitle, campaignRef: null };

  const discount = formatCouponDiscount(promo);
  if (discount) return { title: `Desconto de ${discount}`, campaignRef: null };
  return { title: rawDesc || "Campanha na loja", campaignRef: null };
}

export function formatCouponTitle(promo: Promotion): string {
  return resolveCouponDisplayTitle(promo).title;
}

export function formatCouponValidity(promo: Promotion): string {
  if (promo.endDate) {
    const d = new Date(promo.endDate);
    if (!Number.isNaN(d.getTime())) {
      return `Válido até ${d.toLocaleDateString("pt-PT", {
        day: "numeric",
        month: "long",
      })}`;
    }
  }
  return "Consulte validade na loja";
}

export async function copyCouponCode(code: string): Promise<boolean> {
  const text = code.trim();
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export const STORE_BADGE_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  worten: { bg: "bg-red-600", text: "text-white", ring: "ring-red-200" },
  globaldata: { bg: "bg-sky-700", text: "text-white", ring: "ring-sky-200" },
  pccomponentes: { bg: "bg-orange-600", text: "text-white", ring: "ring-orange-200" },
  default: { bg: "bg-slate-700", text: "text-white", ring: "ring-slate-200" },
};

export function resolveStoreLabel(slug: string, name?: string | null): string {
  return storeDisplayName(normalizeCouponStoreSlug(slug), name || undefined);
}

export function resolveStoreLogo(slug: string): string | undefined {
  return getCouponStoreMeta(normalizeCouponStoreSlug(slug))?.logoUrl;
}
