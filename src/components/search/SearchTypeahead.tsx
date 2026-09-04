"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  searchProducts,
  suggestSearch,
  type ApiProductSummary,
  type SearchSuggestResponse,
} from "@/lib/api";
import { isAbortError } from "@/lib/api-client";
import { isP33SearchEnabled } from "@/lib/search/flags";
import { cn, formatEUR } from "@/lib/utils";
import { WifiLoader } from "@/components/ui/WifiLoader";

type Props = {
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  defaultQuery?: string;
  placeholder?: string;
  /** Compacto para header sticky */
  compact?: boolean;
};

export function SearchTypeahead({
  className,
  inputClassName,
  autoFocus,
  defaultQuery = "",
  placeholder = "Procurar produto, marca ou categoria…",
  compact,
}: Props) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [legacy, setLegacy] = useState<ApiProductSummary[]>([]);
  const [suggest, setSuggest] = useState<SearchSuggestResponse | null>(null);
  const p33 = isP33SearchEnabled();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      abortRef.current?.abort();
      setLegacy([]);
      setSuggest(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const run = p33
        ? suggestSearch(q, { limit: 8, signal: controller.signal }).then((res) => {
            setSuggest(res);
            setLegacy([]);
          })
        : searchProducts(q, { limit: 8, signal: controller.signal }).then((res) => {
            setLegacy(res.results);
            setSuggest(null);
          });
      run
        .catch((err) => {
          if (isAbortError(err)) return;
          setLegacy([]);
          setSuggest(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 280);
    return () => {
      window.clearTimeout(handle);
      abortRef.current?.abort();
    };
  }, [query, p33]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function goSearch(raw: string) {
    const q = raw.trim();
    if (!q) return;
    if (
      p33 &&
      suggest?.categoryRedirect?.url &&
      suggest.intent?.intent_type === "category"
    ) {
      go(suggest.categoryRedirect.url);
      return;
    }
    go(`/search/?q=${encodeURIComponent(q)}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    goSearch(query);
  }

  const trimmed = query.trim();
  const hasGroups =
    p33 &&
    suggest &&
    (suggest.products.length > 0 ||
      suggest.categories.length > 0 ||
      suggest.brands.length > 0 ||
      suggest.suggestions.length > 0 ||
      suggest.landings.length > 0);
  const showDropdown =
    open && (loading || hasGroups || legacy.length > 0 || trimmed.length >= 2);

  return (
    <form onSubmit={onSubmit} className={cn("relative w-full", className)}>
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 text-slate-400",
          compact ? "left-3 h-4 w-4" : "left-4 h-5 w-5",
        )}
      />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 160);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          "w-full",
          compact
            ? "h-10 rounded-xl border-slate-200 bg-white pl-9 text-sm"
            : "h-14 rounded-2xl border-slate-200 bg-white pl-12 text-base shadow-lg",
          inputClassName,
        )}
        aria-label="Procurar produto"
        aria-expanded={showDropdown}
        aria-controls={listId}
        aria-autocomplete="list"
        role="combobox"
      />
      {showDropdown ? (
        <div
          id={listId}
          className="absolute top-full left-0 right-0 z-50 mt-2 max-h-[70vh] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl"
          role="listbox"
        >
          {loading ? (
            <div className="wifi-loader-block wifi-loader-block--compact">
              <WifiLoader text="A procurar" size="sm" />
            </div>
          ) : p33 && suggest ? (
            <SuggestGroups
              suggest={suggest}
              onPick={(href) => go(href)}
              onSearchAll={() => goSearch(query)}
            />
          ) : legacy.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-600">
              Sem sugestões. Enter para ver todos os resultados.
            </p>
          ) : (
            <ul>
              {legacy.map((p) => (
                <li key={p.ean} role="option">
                  <button
                    type="button"
                    onMouseDown={() =>
                      go(`/p/?id=${encodeURIComponent(p.slug)}`)
                    }
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="line-clamp-2 font-medium text-slate-900">
                      {p.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-600">
                      {formatEUR(p.currentPrice)}
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onMouseDown={() => goSearch(query)}
                  className="w-full border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-sky-700 hover:bg-slate-50"
                >
                  Ver todos os resultados
                </button>
              </li>
            </ul>
          )}
        </div>
      ) : null}
    </form>
  );
}

function SuggestGroups({
  suggest,
  onPick,
  onSearchAll,
}: {
  suggest: SearchSuggestResponse;
  onPick: (href: string) => void;
  onSearchAll: () => void;
}) {
  const empty =
    !suggest.products.length &&
    !suggest.categories.length &&
    !suggest.brands.length &&
    !suggest.suggestions.length &&
    !suggest.landings.length;

  if (empty) {
    return (
      <p className="px-4 py-3 text-sm text-slate-600">
        Sem sugestões. Enter para pesquisar «{suggest.query}».
      </p>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {suggest.products.length > 0 ? (
        <Group title="Produtos">
          {suggest.products.map((p) => (
            <button
              key={p.ean || p.slug}
              type="button"
              role="option"
              onMouseDown={() =>
                onPick(p.url || `/p/?id=${encodeURIComponent(p.slug || "")}`)
              }
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
            >
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-medium text-slate-900">
                  {p.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {[p.brand, p.category].filter(Boolean).join(" · ")}
                </span>
              </span>
              {p.currentPrice != null ? (
                <span className="shrink-0 text-sm tabular-nums text-slate-700">
                  {formatEUR(p.currentPrice)}
                </span>
              ) : null}
            </button>
          ))}
        </Group>
      ) : null}
      {suggest.categories.length > 0 ? (
        <Group title="Categorias">
          {suggest.categories.map((c) => (
            <Row
              key={c.slug || c.label}
              label={c.label || c.slug || ""}
              hint="Categoria"
              onPick={() => onPick(c.url || `/categoria/${c.slug}/`)}
            />
          ))}
        </Group>
      ) : null}
      {suggest.brands.length > 0 ? (
        <Group title="Marcas">
          {suggest.brands.map((b) => (
            <Row
              key={b.name}
              label={b.name || ""}
              hint="Marca"
              onPick={() =>
                onPick(
                  b.url || `/search/?q=${encodeURIComponent(b.name || "")}`,
                )
              }
            />
          ))}
        </Group>
      ) : null}
      {suggest.landings.length > 0 ? (
        <Group title="Guias">
          {suggest.landings.map((L) => (
            <Row
              key={L.url || L.title}
              label={L.title || ""}
              hint="Landing"
              onPick={() => onPick(L.url || "/")}
            />
          ))}
        </Group>
      ) : null}
      {suggest.suggestions.length > 0 ? (
        <Group title="Sugestões">
          {suggest.suggestions.map((s) => (
            <Row
              key={s.text}
              label={s.text || ""}
              hint={s.type === "did_you_mean" ? "Quis dizer" : "Também podes"}
              onPick={() =>
                onPick(
                  s.url || `/search/?q=${encodeURIComponent(s.text || "")}`,
                )
              }
            />
          ))}
        </Group>
      ) : null}
      <button
        type="button"
        onMouseDown={onSearchAll}
        className="w-full px-4 py-2.5 text-left text-sm font-medium text-sky-700 hover:bg-slate-50"
      >
        Ver todos os resultados
      </button>
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="px-4 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({
  label,
  hint,
  onPick,
}: {
  label: string;
  hint?: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      onMouseDown={onPick}
      className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50"
    >
      <span className="font-medium text-slate-900">{label}</span>
      {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
    </button>
  );
}
