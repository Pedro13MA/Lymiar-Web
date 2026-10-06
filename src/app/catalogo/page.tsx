import type { Metadata } from "next";
import CatalogoRedirectClient from "./CatalogoRedirectClient";

export const metadata: Metadata = {
  title: "Catálogo",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://lymiar.com/catalog/" },
};

export default function CatalogoRedirectPage() {
  return <CatalogoRedirectClient />;
}
