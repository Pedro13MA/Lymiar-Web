"use client";

import Link from "next/link";
import type { NavGroup, NavL1Column, NavLinkItem } from "@/lib/nav/types";

type Props = {
  column: NavL1Column;
  onNavigate?: () => void;
};

function GroupBlock({
  group,
  onNavigate,
}: {
  group: NavGroup;
  onNavigate?: () => void;
}) {
  return (
    <div className="min-w-0">
      <Link
        href={group.href}
        onClick={onNavigate}
        className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 transition-colors hover:text-slate-700"
      >
        {group.title}
      </Link>
      <ul className="mt-2.5 grid gap-0.5">
        {group.items.map((item) => (
          <li key={item.slug}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`block rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-50 hover:text-[var(--hm-brand-deep,#e2550f)] ${
                item.popular
                  ? "font-medium text-slate-800"
                  : "text-slate-600"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Full subcategory map for a column — all groups, no "ver tudo". */
export function MegaMenuColumn({ column, onNavigate }: Props) {
  const groups =
    column.groups?.length > 0
      ? column.groups
      : [
          {
            title: column.label,
            slug: column.anchorSlug,
            href: column.href,
            items: column.items,
          } satisfies NavGroup,
        ];

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-lg leading-none" aria-hidden>
          {column.emoji}
        </span>
        <Link
          href={column.href}
          onClick={onNavigate}
          className="font-display text-[15px] font-semibold tracking-tight text-slate-900 transition-colors hover:text-[var(--hm-brand-deep,#e2550f)]"
        >
          {column.label}
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <GroupBlock key={group.slug} group={group} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

export function MegaMenuQuickLinks({
  links,
  onNavigate,
}: {
  links: NavLinkItem[];
  onNavigate?: () => void;
}) {
  if (!links.length) return null;
  return (
    <div className="min-w-[10rem] shrink-0 border-l border-slate-200/80 pl-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        Populares
      </p>
      <ul className="mt-3 grid gap-1">
        {links.map((l) => (
          <li key={`ql-${l.slug}`}>
            <Link
              href={l.href}
              onClick={onNavigate}
              className="block rounded-md px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-sky-700"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MegaMenuBrands({
  brands,
  onNavigate,
}: {
  brands: { label: string; href: string }[];
  onNavigate?: () => void;
}) {
  if (!brands.length) return null;
  return (
    <div className="min-w-[9rem] shrink-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        Marcas
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {brands.map((b) => (
          <li key={b.label}>
            <Link
              href={b.href}
              onClick={onNavigate}
              className="inline-block rounded-full border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[var(--hm-brand-deep,#e2550f)]"
            >
              {b.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
