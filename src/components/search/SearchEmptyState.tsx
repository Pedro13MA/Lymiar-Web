"use client";

import Link from "next/link";
import { isP33SearchEnabled } from "@/lib/search/flags";

type Props = {
  query: string;
  didYouMean?: string[];
  relatedQueries?: string[];
  categoryRedirect?: { slug: string; url: string } | null;
  inferred?: string | null;
};

export function SearchEmptyState({
  query,
  didYouMean = [],
  relatedQueries = [],
  categoryRedirect,
  inferred,
}: Props) {
  const showHints = isP33SearchEnabled();
  const primary = didYouMean[0];
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-8 text-center">
      {showHints && primary ? (
        <>
          <p className="text-sm leading-relaxed text-slate-600">
            Sem resultados exactos para «{query}».
          </p>
          <p className="mt-4 text-base text-slate-800">
            Quiseste dizer{" "}
            <Link
              href={`/search/?q=${encodeURIComponent(primary)}`}
              className="font-semibold text-sky-700 underline-offset-2 hover:underline"
            >
              {primary}
            </Link>
            ?
          </p>
          {didYouMean.length > 1 ? (
            <p className="mt-3 text-sm text-slate-600">
              Ou{" "}
              {didYouMean.slice(1).map((t, i) => (
                <span key={t}>
                  {i > 0 ? ", " : null}
                  <Link
                    href={`/search/?q=${encodeURIComponent(t)}`}
                    className="font-medium text-sky-700 underline-offset-2 hover:underline"
                  >
                    {t}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm leading-relaxed text-slate-600">
          Não encontrámos produtos para «{query}» com os filtros actuais.
        </p>
      )}
      {showHints && relatedQueries.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Também podes procurar
          </p>
          <ul className="mt-2 flex flex-wrap justify-center gap-2">
            {relatedQueries.slice(0, 6).map((t) => (
              <li key={t}>
                <Link
                  href={`/search/?q=${encodeURIComponent(t)}`}
                  className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-sky-200"
                >
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {showHints && categoryRedirect ? (
        <p className="mt-4 text-sm">
          <Link
            href={categoryRedirect.url}
            className="font-medium text-sky-700 underline-offset-2 hover:underline"
          >
            Ver categoria {categoryRedirect.slug.replace(/_/g, " ")}
          </Link>
        </p>
      ) : inferred ? (
        <p className="mt-4 text-sm">
          <Link
            href={`/categoria/${encodeURIComponent(inferred)}/`}
            className="font-medium text-sky-700 underline-offset-2 hover:underline"
          >
            Explorar {inferred}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
