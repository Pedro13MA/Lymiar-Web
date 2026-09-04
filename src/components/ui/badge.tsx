import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-slate-200 bg-slate-50 text-slate-700",
        teal: "border-sky-200 bg-sky-50 text-sky-700",
        buy: "border-[var(--verdict-buy-border)] bg-[var(--verdict-buy-soft)] text-[var(--verdict-buy-text)]",
        fair: "border-[var(--verdict-unknown-border)] bg-[var(--verdict-unknown-soft)] text-[var(--verdict-unknown-text)]",
        wait: "border-[var(--verdict-wait-border)] bg-[var(--verdict-wait-soft)] text-[var(--verdict-wait-text)]",
        unknown: "border-[var(--verdict-unknown-border)] bg-[var(--verdict-unknown-soft)] text-[var(--verdict-unknown-text)]",
        tier: "border-slate-200 bg-white text-slate-600",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
