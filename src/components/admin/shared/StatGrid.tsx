"use client";

import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  cols?: 2 | 3 | 4 | 5 | 6 | 7;
};

const COLS: Record<NonNullable<Props["cols"]>, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  6: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  7: "sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7",
};

export function StatGrid({ children, className, cols = 5 }: Props) {
  return (
    <div className={cn("grid grid-cols-1 gap-3", COLS[cols], className)}>
      {children}
    </div>
  );
}
