"use client";

import { useState } from "react";
import { Check, ExternalLink, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { patchAdminProduct } from "@/services/admin/products";

type Props = {
  ean: string;
  canonicalName: string | null;
  brand: string | null;
  canonicalModel: string | null;
  onSaved: () => void;
};

export function QuickProductEdit({
  ean,
  canonicalName,
  brand,
  canonicalModel,
  onSaved,
}: Props) {
  const [title, setTitle] = useState(canonicalName || "");
  const [brandVal, setBrandVal] = useState(brand || "");
  const [model, setModel] = useState(canonicalModel || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const fields: Record<string, unknown> = {};
    if (title !== (canonicalName || "")) fields.canonical_name = title || null;
    if (brandVal !== (brand || "")) fields.brand = brandVal || null;
    if (model !== (canonicalModel || "")) fields.canonical_model = model || null;
    if (!Object.keys(fields).length) {
      setMsg("Sem alterações.");
      setBusy(false);
      return;
    }
    try {
      await patchAdminProduct(ean, fields);
      setMsg("Guardado — página pública actualizada.");
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "save_error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-faint)]">
          Edição rápida (título & identidade)
        </p>
        <Link
          href={`/p/?id=${encodeURIComponent(ean)}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-xs text-[var(--admin-brand)] hover:underline"
        >
          Ver no site <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm">
          <span className="text-xs text-[var(--admin-muted)]">Título público</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-[var(--admin-muted)]">Marca</span>
          <input
            value={brandVal}
            onChange={(e) => setBrandVal(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-[var(--admin-muted)]">Modelo</span>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--admin-brand)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar alterações
        </button>
        {msg && (
          <span className="text-xs text-[var(--admin-muted)] flex items-center gap-1">
            {msg.includes("Guardado") && <Check className="h-3.5 w-3.5 text-[var(--admin-ok)]" />}
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
