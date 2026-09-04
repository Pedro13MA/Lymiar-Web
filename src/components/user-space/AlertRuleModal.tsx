"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/auth/SessionProvider";
import { getAlertForProduct, upsertAlert } from "@/lib/user-space";
import {
  ALERT_CONDITION_LABEL,
  ALERT_KIND_LABEL,
  type AlertConditionId,
  type AlertKind,
  type AlertRule,
  type ProductSnapshot,
} from "@/lib/user-space/types";
import { STORE_LOGOS } from "@/lib/storeLogos";
import { cn, formatEUR } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  product: ProductSnapshot;
  onSaved?: (rule: AlertRule) => void;
  /** UI simplificada para a página de produto. */
  variant?: "full" | "product";
  /** Mínimo histórico observado — ajuda a calibrar o alvo. */
  historicalMin?: number | null;
};

const KINDS: AlertKind[] = [
  "price_below",
  "percent_below",
  "historical_min",
  "cheaper_store_change",
  "back_in_stock",
];

const CONDITIONS: AlertConditionId[] = [
  "NEW",
  "OPEN_BOX",
  "OUTLET",
  "REFURBISHED",
  "USED",
];

type ProductMode = "price" | "percent";

function parsePositive(raw: string): number | null {
  const n = Number(String(raw).replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function AlertRuleModal({
  open,
  onClose,
  product,
  onSaved,
  variant = "full",
  historicalMin = null,
}: Props) {
  const { status } = useSession();
  const [kind, setKind] = useState<AlertKind>("price_below");
  const [priceTarget, setPriceTarget] = useState("");
  const [percentBelow, setPercentBelow] = useState("10");
  const [storesAll, setStoresAll] = useState(true);
  const [stores, setStores] = useState<string[]>([]);
  const [conditions, setConditions] = useState<AlertConditionId[]>(["NEW"]);
  const [existingId, setExistingId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<ProductMode>("percent");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const existing = await getAlertForProduct(product.slug);
      if (cancelled) return;
      if (existing) {
        setExistingId(existing.id);
        setKind(existing.kind);
        setPriceTarget(
          existing.priceTarget != null ? String(existing.priceTarget) : "",
        );
        setPercentBelow(
          existing.percentBelow != null ? String(existing.percentBelow) : "10",
        );
        setStoresAll(existing.stores === "all");
        setStores(existing.stores === "all" ? [] : existing.stores);
        setConditions(existing.conditions.length ? existing.conditions : ["NEW"]);
        if (variant === "product") {
          setMode(existing.kind === "percent_below" ? "percent" : "price");
          if (
            existing.kind === "price_below" &&
            existing.priceTarget != null &&
            !(existing.percentBelow != null)
          ) {
            setPriceTarget(String(existing.priceTarget));
          }
        }
      } else {
        setExistingId(undefined);
        setKind("price_below");
        const defaultPct = 10;
        const defaultTarget =
          product.currentPrice > 0
            ? Math.round(product.currentPrice * (1 - defaultPct / 100) * 100) /
              100
            : 0;
        setPriceTarget(defaultTarget > 0 ? String(defaultTarget) : "");
        setPercentBelow(String(defaultPct));
        setStoresAll(true);
        setStores([]);
        setConditions(["NEW"]);
        setMode("percent");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, product.slug, product.currentPrice, variant]);

  const percentValue = parsePositive(percentBelow);
  const priceFromPercent =
    percentValue != null && product.currentPrice > 0
      ? Math.round(product.currentPrice * (1 - percentValue / 100) * 100) / 100
      : null;

  const absoluteTarget =
    mode === "percent" ? priceFromPercent : parsePositive(priceTarget);

  const histMin =
    historicalMin != null && historicalMin > 0 ? historicalMin : null;

  const unrealistic = useMemo(() => {
    if (absoluteTarget == null || !(product.currentPrice > 0)) return false;
    if (absoluteTarget >= product.currentPrice) return true;
    if (histMin != null && absoluteTarget < histMin * 0.85) return true;
    const dropPct =
      ((product.currentPrice - absoluteTarget) / product.currentPrice) * 100;
    return dropPct >= 40;
  }, [absoluteTarget, product.currentPrice, histMin]);

  if (!open) return null;

  if (variant === "product") {
    const saveProduct = async () => {
      if (saving) return;
      if (status !== "authenticated") {
        window.location.href = `/entrar/?next=${encodeURIComponent(
          `/p/?id=${encodeURIComponent(product.slug)}`,
        )}`;
        return;
      }
      if (absoluteTarget == null || !(absoluteTarget > 0)) return;

      setSaving(true);
      try {
        const rule = await upsertAlert({
          id: existingId,
          slug: product.slug,
          ean: product.ean,
          productName: product.name,
          imageUrl: product.imageUrl,
          kind: mode === "percent" ? "percent_below" : "price_below",
          priceTarget: mode === "price" ? absoluteTarget : absoluteTarget,
          percentBelow: mode === "percent" ? percentValue : null,
          referencePrice: product.currentPrice,
          stores: "all",
          conditions: ["NEW"],
          active: true,
          lastTriggeredAt: null,
        });
        onSaved?.(rule);
        onClose();
      } finally {
        setSaving(false);
      }
    };

    return (
      <div
        className="fixed inset-0 z-[75] flex items-end justify-center sm:items-center"
        role="dialog"
        aria-modal
        aria-labelledby="alert-product-title"
      >
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/40"
          aria-label="Fechar"
          onClick={onClose}
        />

        <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2
                id="alert-product-title"
                className="font-display text-sm font-semibold text-slate-900"
              >
                Alerta por email
              </h2>
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                {product.name} · agora {formatEUR(product.currentPrice)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {histMin != null ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                Mínimo observado neste produto:{" "}
                <span className="font-semibold text-slate-900">
                  {formatEUR(histMin)}
                </span>
                . Usa isto como referência para um alvo realista.
              </p>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                Ainda há pouco histórico neste produto — um alvo muito baixo
                pode nunca ser atingido.
              </p>
            )}

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Como defines o alvo
              </legend>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm",
                  mode === "percent"
                    ? "border-[var(--hm-brand,#ff6a1a)] bg-[color-mix(in_srgb,var(--hm-brand,#ff6a1a)_10%,white)]"
                    : "border-slate-200 hover:bg-slate-50",
                )}
              >
                <input
                  type="radio"
                  name="alert-mode"
                  checked={mode === "percent"}
                  onChange={() => setMode("percent")}
                  className="mt-0.5"
                />
                <span>Percentagem de desconto sobre o preço actual</span>
              </label>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm",
                  mode === "price"
                    ? "border-[var(--hm-brand,#ff6a1a)] bg-[color-mix(in_srgb,var(--hm-brand,#ff6a1a)_10%,white)]"
                    : "border-slate-200 hover:bg-slate-50",
                )}
              >
                <input
                  type="radio"
                  name="alert-mode"
                  checked={mode === "price"}
                  onChange={() => setMode("price")}
                  className="mt-0.5"
                />
                <span>Preço alvo em euros</span>
              </label>
            </fieldset>

            {mode === "percent" ? (
              <div className="space-y-2">
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-600">Desconto desejado (%)</span>
                  <Input
                    inputMode="decimal"
                    value={percentBelow}
                    onChange={(e) => setPercentBelow(e.target.value)}
                    className="h-10"
                    placeholder="ex.: 10"
                  />
                </label>
                {priceFromPercent != null ? (
                  <p className="text-sm text-slate-700">
                    Com{" "}
                    <span className="font-semibold">{percentValue}%</span> de
                    desconto sobre {formatEUR(product.currentPrice)}, o alvo
                    fica em{" "}
                    <span className="font-semibold text-slate-900">
                      {formatEUR(priceFromPercent)}
                    </span>
                    .
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    Indica uma percentagem positiva para ver o preço alvo.
                  </p>
                )}
              </div>
            ) : (
              <label className="block space-y-1 text-sm">
                <span className="text-slate-600">Preço alvo (€)</span>
                <Input
                  inputMode="decimal"
                  value={priceTarget}
                  onChange={(e) => setPriceTarget(e.target.value)}
                  className="h-10"
                  placeholder="ex.: 89.90"
                />
              </label>
            )}

            <div className="space-y-2 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-600">
              <p>
                Vais receber um email na tua conta Google quando o preço
                observado atingir{" "}
                {absoluteTarget != null ? (
                  <span className="font-semibold text-slate-900">
                    {formatEUR(absoluteTarget)}
                  </span>
                ) : (
                  "o alvo"
                )}
                .
              </p>
              {unrealistic ? (
                <p className="text-amber-800">
                  Este alvo parece pouco realista face ao preço actual
                  {histMin != null
                    ? ` e ao mínimo observado (${formatEUR(histMin)})`
                    : ""}
                  . É provável que nunca recebas o email.
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Se o alvo for demasiado baixo, pode nunca ser atingido — o
                  Lymiar só avisa com preços realmente observados.
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 p-4">
            <Button
              type="button"
              className="w-full"
              disabled={saving || absoluteTarget == null}
              onClick={() => void saveProduct()}
            >
              {status === "authenticated"
                ? existingId
                  ? "Actualizar alerta"
                  : "Activar alerta por email"
                : "Entrar para activar alerta"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const toggleCondition = (id: AlertConditionId) => {
    setConditions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const toggleStore = (slug: string) => {
    setStores((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const rule = await upsertAlert({
        id: existingId,
        slug: product.slug,
        ean: product.ean,
        productName: product.name,
        imageUrl: product.imageUrl,
        kind,
        priceTarget:
          kind === "price_below" && priceTarget ? Number(priceTarget) : null,
        percentBelow:
          kind === "percent_below" && percentBelow
            ? Number(percentBelow)
            : null,
        referencePrice: product.currentPrice,
        stores: storesAll ? "all" : stores,
        conditions,
        active: true,
        lastTriggeredAt: null,
      });
      onSaved?.(rule);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Criar alerta
            </h2>
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
              {product.name} · {formatEUR(product.currentPrice)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Condição do alerta
            </legend>
            {KINDS.map((k) => (
              <label
                key={k}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm",
                  kind === k
                    ? "border-sky-300 bg-sky-50"
                    : "border-slate-200 hover:bg-slate-50",
                )}
              >
                <input
                  type="radio"
                  name="alert-kind"
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="mt-0.5"
                />
                <span>{ALERT_KIND_LABEL[k]}</span>
              </label>
            ))}
          </fieldset>

          {kind === "price_below" ? (
            <label className="block space-y-1 text-sm">
              <span className="text-slate-600">Preço inferior a (€)</span>
              <Input
                inputMode="decimal"
                value={priceTarget}
                onChange={(e) => setPriceTarget(e.target.value)}
                className="h-10"
              />
            </label>
          ) : null}

          {kind === "percent_below" ? (
            <label className="block space-y-1 text-sm">
              <span className="text-slate-600">% abaixo do preço actual</span>
              <Input
                inputMode="decimal"
                value={percentBelow}
                onChange={(e) => setPercentBelow(e.target.value)}
                className="h-10"
              />
            </label>
          ) : null}

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Lojas
            </legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={storesAll}
                onChange={(e) => setStoresAll(e.target.checked)}
              />
              Todas
            </label>
            {!storesAll ? (
              <div className="grid grid-cols-2 gap-1.5">
                {STORE_LOGOS.map((s) => (
                  <label
                    key={s.slug}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={stores.includes(s.slug)}
                      onChange={() => toggleStore(s.slug)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            ) : null}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Estado do produto
            </legend>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => {
                const on = conditions.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCondition(c)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium",
                      on
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600",
                    )}
                  >
                    {ALERT_CONDITION_LABEL[c]}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="border-t border-slate-200 p-4">
          <Button
            type="button"
            className="w-full"
            disabled={saving}
            onClick={() => void save()}
          >
            {existingId ? "Actualizar alerta" : "Criar alerta"}
          </Button>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Recebes email quando o preço observado atingir o alvo.
          </p>
        </div>
      </div>
    </div>
  );
}
