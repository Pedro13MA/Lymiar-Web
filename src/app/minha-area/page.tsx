import type { Metadata } from "next";
import { MinhaAreaPageClient } from "@/components/watchlists/MinhaAreaPageClient";

export const metadata: Metadata = {
  title: "Minha Área · Lymiar",
  description:
    "Resumo dos favoritos, alertas, projetos, timeline e watchlists.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/minha-area/" },
};

export default function MinhaAreaPage() {
  return <MinhaAreaPageClient />;
}
