"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** Legacy path — keep so old links don't 404 on static export. */
export default function CatalogoRedirectClient() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/catalog/");
  }, [router]);

  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-slate-600">A redireccionar para o catálogo…</p>
      <Link
        href="/catalog/"
        className="mt-4 inline-block font-semibold text-[var(--hm-brand,#ff6a1a)] underline-offset-2 hover:underline"
      >
        Ir para o catálogo
      </Link>
    </main>
  );
}
