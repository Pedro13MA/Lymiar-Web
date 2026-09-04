"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Search } from "lucide-react";
import { ADMIN_NAV } from "@/services/admin/navigation";
import { searchAdminProducts } from "@/services/admin/products";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<
    Array<{ ean: string; canonical_name: string | null }>
  >([]);
  const [searchBusy, setSearchBusy] = useState(false);

  const navItems = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return ADMIN_NAV;
    return ADMIN_NAV.filter(
      (n) => n.label.toLowerCase().includes(query) || n.href.includes(query),
    );
  }, [q]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setProducts([]);
    }
  }, [open]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setProducts([]);
      return;
    }
    const t = window.setTimeout(() => {
      setSearchBusy(true);
      void searchAdminProducts({ q: query, limit: 8 })
        .then((r) =>
          setProducts(
            r.products.map((p) => ({
              ean: p.ean,
              canonical_name: p.canonical_name,
            })),
          ),
        )
        .catch(() => setProducts([]))
        .finally(() => setSearchBusy(false));
    }, 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const goProduct = (ean: string) => {
    router.push(`/control-center/produtos/?ean=${encodeURIComponent(ean)}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-[var(--admin-border)] px-3">
          <Search className="h-4 w-4 text-[var(--admin-faint)]" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Página, produto, EAN…"
            className="h-12 w-full bg-transparent text-sm text-[var(--admin-text)] outline-none placeholder:text-[var(--admin-faint)]"
          />
        </div>
        <ul className="max-h-72 overflow-auto p-2 admin-scroll">
          {products.length > 0 && (
            <li className="px-2 pb-1 text-[10px] uppercase tracking-wide text-[var(--admin-faint)]">
              Produtos
            </li>
          )}
          {products.map((p) => (
            <li key={p.ean}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--admin-hover)]"
                onClick={() => goProduct(p.ean)}
              >
                <Package className="h-4 w-4 shrink-0 text-[var(--admin-faint)]" />
                <span className="truncate">{p.canonical_name || p.ean}</span>
                <span className="ml-auto font-mono text-[10px] text-[var(--admin-faint)]">
                  {p.ean}
                </span>
              </button>
            </li>
          ))}
          {searchBusy && (
            <li className="px-3 py-2 text-xs text-[var(--admin-faint)]">A pesquisar…</li>
          )}
          <li className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wide text-[var(--admin-faint)]">
            Navegação
          </li>
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--admin-hover)]",
                )}
                onClick={() => {
                  router.push(item.href);
                  onClose();
                }}
              >
                <span>{item.label}</span>
                <span className="text-[11px] text-[var(--admin-faint)]">{item.href}</span>
              </button>
            </li>
          ))}
          {navItems.length === 0 && !products.length && !searchBusy ? (
            <li className="px-3 py-6 text-center text-xs text-[var(--admin-faint)]">
              Sem resultados
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
