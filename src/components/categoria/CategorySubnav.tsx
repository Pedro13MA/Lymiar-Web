"use client";

import Link from "next/link";
import type { CategoryChild } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  activeSlug: string;
  nodes: CategoryChild[];
  label?: string;
};

export function CategorySubnav({ activeSlug, nodes, label = "Explorar" }: Props) {
  if (!nodes.length) return null;

  return (
    <nav
      className="mb-6 -mx-1 flex flex-wrap gap-2 px-1"
      aria-label={label}
    >
      <span className="mr-1 self-center text-xs font-semibold uppercase tracking-wide text-[var(--hm-faint)]">
        {label}
      </span>
      {nodes.map((node) => {
        const active = node.slug === activeSlug;
        return (
          <Link
            key={node.slug}
            href={node.path || `/categoria/${node.slug}/`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-[var(--hm-brand-deep)] bg-[var(--hm-brand-soft)] font-medium text-[var(--hm-brand-deep)]"
                : "border-[var(--hm-line)] bg-[var(--hm-bg-elevated)] text-[var(--hm-ink)] hover:border-[var(--hm-brand)] hover:text-[var(--hm-brand-deep)]",
            )}
          >
            {node.display_name}
          </Link>
        );
      })}
    </nav>
  );
}
