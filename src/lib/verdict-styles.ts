/** Tons canónicos de veredicto — verde · laranja · amarelo */

export type VerdictTone = "buy" | "wait" | "unknown";

export function normalizeVerdictTone(
  tone: string | undefined | null,
): VerdictTone {
  if (tone === "buy") return "buy";
  if (tone === "wait") return "wait";
  return "unknown";
}

/** Badge dentro do card (fundo + texto da decisão). */
export function verdictBadgeClass(tone: string): string {
  return `lymiar-verdict-badge lymiar-verdict-badge--${normalizeVerdictTone(tone)}`;
}

/** Borda do card completo. */
export function verdictCardClass(tone: string): string {
  return `lymiar-verdict-card lymiar-verdict-card--${normalizeVerdictTone(tone)}`;
}

/** Compat: classes antigas do catálogo. */
export function verdictCatalogBadgeClass(tone: string): string {
  const t = normalizeVerdictTone(tone);
  if (t === "buy") return "catalog-badge-buy";
  if (t === "wait") return "catalog-badge-wait";
  return "catalog-badge-unknown";
}

export function verdictCatalogCardClass(tone: string): string {
  const t = normalizeVerdictTone(tone);
  if (t === "buy") return "catalog-card-verdict-buy";
  if (t === "wait") return "catalog-card-verdict-wait";
  return "catalog-card-verdict-unknown";
}
