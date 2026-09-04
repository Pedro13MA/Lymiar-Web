import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  children: ReactNode;
  external?: boolean;
  className?: string;
};

/** Botão header Entrar — gradient coral/laranja. */
export function GlowingNavButton({
  href,
  children,
  external,
  className,
}: Props) {
  const classes = cn("lymiar-glow-btn button-87", className);

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
