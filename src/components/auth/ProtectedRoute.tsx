"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/auth/SessionProvider";
import { LoadingAuth } from "@/components/auth/LoadingAuth";

const PROTECTED_PREFIXES = [
  "/favoritos",
  "/alertas",
  "/projetos",
  "/timeline",
  "/listas",
  "/perfil",
  "/notificacoes",
];

export function isProtectedPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const p = pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
  return PROTECTED_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`),
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      const next = encodeURIComponent(pathname || "/minha-area/");
      router.replace(`/entrar/?next=${next}`);
    }
  }, [status, router, pathname]);

  if (status === "loading") {
    return <LoadingAuth />;
  }
  if (status !== "authenticated") {
    return <LoadingAuth label="A redirecionar para entrar…" />;
  }
  return <>{children}</>;
}
