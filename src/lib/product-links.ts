import type { Product } from "@/lib/types";

/** URL canónica de PDP (export estático + API). */
export function productPageHref(product: Product): string {
  const id = (product.slug || product.ean || "").trim();
  return id ? `/p/?id=${encodeURIComponent(id)}` : "/search/";
}
