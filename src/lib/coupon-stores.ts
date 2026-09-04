/** Lojas do Hub de Cupões e grelha da homepage — metadados UI. */

import {
  getStoreLogoMeta,
  storeDisplayName as displayNameFromRegistry,
  storeLogoUrl as logoUrlFromRegistry,
} from "@/lib/storeLogos";

export type CouponStoreMeta = {
  slug: string;
  name: string;
  logoUrl: string;
};

function toMeta(slug: string, name?: string): CouponStoreMeta {
  const reg = getStoreLogoMeta(slug);
  return {
    slug: reg?.slug || slug,
    name: name || reg?.name || slug,
    logoUrl: logoUrlFromRegistry(slug),
  };
}

export const COUPON_HUB_STORES: CouponStoreMeta[] = [
  toMeta("worten"),
  toMeta("amazon"),
  toMeta("pccomponentes"),
  toMeta("globaldata"),
  toMeta("powerplanet"),
  toMeta("padelmarket"),
  toMeta("lumories"),
];

/** Lojas apresentadas na homepage (logos). */
export const MONITORED_STORES: CouponStoreMeta[] = [
  ...COUPON_HUB_STORES,
  toMeta("fnac"),
  toMeta("castro"),
  toMeta("switch"),
  toMeta("pcdiga"),
  toMeta("radio-popular"),
];

export function getCouponStoreMeta(slug: string): CouponStoreMeta | undefined {
  const key = (slug || "").trim().toLowerCase();
  const fromLists =
    COUPON_HUB_STORES.find((s) => s.slug === key) ||
    MONITORED_STORES.find((s) => s.slug === key);
  if (fromLists) return fromLists;
  const reg = getStoreLogoMeta(key);
  if (!reg) return undefined;
  return toMeta(reg.slug, reg.name);
}

export function storeLogoUrl(slug: string): string {
  return logoUrlFromRegistry(slug);
}

export function storeDisplayName(slug: string, fallback?: string): string {
  return displayNameFromRegistry(slug, fallback);
}
