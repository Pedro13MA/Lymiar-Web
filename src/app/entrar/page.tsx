import type { Metadata } from "next";
import { EntrarPageClient } from "@/components/auth/EntrarPageClient";

export const metadata: Metadata = {
  title: "Área pessoal · Entrar · Lymiar",
  description:
    "Desbloqueia a tua área pessoal no Lymiar: favoritos, alertas, timeline, projetos, listas e histórico — sincronizado entre dispositivos.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/entrar/" },
};

export default function EntrarPage() {
  return <EntrarPageClient />;
}
