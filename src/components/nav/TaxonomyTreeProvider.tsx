"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getTaxonomyTree } from "@/lib/api";
import { buildDrillNavFromTree } from "@/lib/nav/build-menu";
import type { DrillNavModel, TaxonomyTreeNode } from "@/lib/nav/types";

type Ctx = {
  tree: TaxonomyTreeNode[];
  megaMenu: DrillNavModel | null;
  taxonomyVersion: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const TaxonomyNavContext = createContext<Ctx | null>(null);

export function TaxonomyTreeProvider({ children }: { children: ReactNode }) {
  const [tree, setTree] = useState<TaxonomyTreeNode[]>([]);
  const [taxonomyVersion, setTaxonomyVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Prefer 1.2 when API allows; fall back to default (1.1).
    getTaxonomyTree("1.2")
      .catch(() => getTaxonomyTree())
      .then((res) => {
        if (cancelled) return;
        setTree(res.tree || []);
        setTaxonomyVersion(res.taxonomy_version || null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTree([]);
        setError(err instanceof Error ? err.message : "taxonomy_tree_failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const megaMenu = useMemo(() => {
    if (!tree.length) return null;
    return buildDrillNavFromTree(tree, taxonomyVersion);
  }, [tree, taxonomyVersion]);

  const value = useMemo(
    () => ({ tree, megaMenu, taxonomyVersion, loading, error, refresh }),
    [tree, megaMenu, taxonomyVersion, loading, error, refresh],
  );

  return (
    <TaxonomyNavContext.Provider value={value}>
      {children}
    </TaxonomyNavContext.Provider>
  );
}

export function useTaxonomyNav(): Ctx {
  const ctx = useContext(TaxonomyNavContext);
  if (!ctx) {
    throw new Error("useTaxonomyNav must be used within TaxonomyTreeProvider");
  }
  return ctx;
}

/** Safe hook when provider may be absent (flag off). */
export function useTaxonomyNavOptional(): Ctx | null {
  return useContext(TaxonomyNavContext);
}
