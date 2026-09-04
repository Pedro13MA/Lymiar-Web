"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FavoriteLoginPrompt({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="favorite-login-title"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl border border-[var(--hm-line,#dde3ea)] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="favorite-login-title"
          className="font-display text-lg font-bold text-[var(--hm-ink,#0b1220)]"
        >
          Entrar na conta
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--hm-muted,#5b6b7c)]">
          Para adicionar aos favoritos e seguir este produto, entra na tua conta
          Lymiar.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/entrar/"
            className="catalog-cta flex-1 text-center no-underline"
          >
            Entrar
          </Link>
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
