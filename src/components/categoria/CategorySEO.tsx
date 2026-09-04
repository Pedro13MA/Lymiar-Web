"use client";

import { useEffect } from "react";
import type { CategorySeo } from "@/lib/api";

type Props = {
  seo: CategorySeo;
  jsonLd?: Record<string, unknown>[];
  description?: string;
  /** UI curta — JSON-LD mantém-se completo. */
  compact?: boolean;
};

/**
 * FASE 7.6 — bloco de conteúdo SEO institucional + JSON-LD.
 * Não inventa specs técnicas.
 */
export function CategorySEO({
  seo,
  jsonLd,
  description,
  compact = true,
}: Props) {
  const text = description || seo.meta_description || seo.description;

  useEffect(() => {
    if (!jsonLd?.length) return;
    const nodes: HTMLScriptElement[] = [];
    for (const block of jsonLd) {
      const el = document.createElement("script");
      el.type = "application/ld+json";
      el.setAttribute("data-lymiar-seo", "1");
      el.text = JSON.stringify(block);
      document.head.appendChild(el);
      nodes.push(el);
    }
    return () => {
      for (const el of nodes) el.remove();
    };
  }, [jsonLd]);

  if (!text) return null;

  const short =
    compact && text.length > 180 ? `${text.slice(0, 177).trim()}…` : text;

  return (
    <p className="max-w-2xl text-sm leading-relaxed text-[var(--hm-muted,#5b6b7c)]">
      {short}
    </p>
  );
}
