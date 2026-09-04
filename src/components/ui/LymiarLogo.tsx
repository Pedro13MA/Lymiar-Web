import Image from "next/image";
import { cn } from "@/lib/utils";

/** Kit oficial — ver `scripts/generate_brand_icons.py` e Desktop/LYMIAR. */
export const LYMIAR_LOGO = {
  /** 1.png — vertical centrada (social, entrar, OG). */
  primary: "/brand/lymiar-logo-primary.png",
  /** 2.png — com respiro (perfil / apple-touch). */
  square: "/brand/lymiar-logo-square.png",
  /** 3.png — horizontal (navbar / footer). */
  horizontal: "/brand/lymiar-logo-horizontal.png",
  /** 4.png — isotipo (favicon pequeno / app icon). */
  mark: "/brand/lymiar-mark.png",
  /** Alias legado → primary. */
  legacy: "/brand/lymiar-logotipo.png",
} as const;

/** Variantes dark (transparentes, invertidas via CSS em dkmode). */
export const LYMIAR_LOGO_DARK = {
  primary: "/brand/lymiar-logo-primary-dark.png",
  square: "/brand/lymiar-logo-square-dark.png",
  horizontal: "/brand/lymiar-logo-horizontal-dark.png",
  mark: "/brand/lymiar-mark-dark.png",
  legacy: "/brand/lymiar-logo-primary-dark.png",
} as const;

export type LymiarLogoVariant = keyof typeof LYMIAR_LOGO;

/** @deprecated prefer LYMIAR_LOGO.primary / .horizontal */
export const LYMIAR_LOGO_SRC = LYMIAR_LOGO.legacy;

type Props = {
  className?: string;
  /**
   * Altura em px CSS. A largura segue o aspect ratio do ficheiro recortado.
   */
  size?: number;
  /** Default `horizontal` — cabeçalho / navbar. */
  variant?: LymiarLogoVariant;
  priority?: boolean;
  /** Vazio = decorativo (aria-hidden). */
  alt?: string;
};

/** width/height após crop ao conteúdo (sem padding transparente). */
const ASPECT: Record<LymiarLogoVariant, number> = {
  primary: 810 / 1048,
  square: 923 / 884,
  horizontal: 1170 / 470,
  mark: 429 / 653,
  legacy: 1219 / 1516,
};

/**
 * Logótipo Lymiar — variantes do kit oficial (leão + coroa).
 */
export function LymiarLogo({
  className,
  size = 32,
  variant = "horizontal",
  priority = false,
  alt = "",
}: Props) {
  const src = LYMIAR_LOGO[variant];
  const srcDark = LYMIAR_LOGO_DARK[variant];
  const aspect = ASPECT[variant];
  const height = size;
  const width = Math.round(size * aspect);
  const imgStyle = { width, height };

  return (
    <span className="inline-flex">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn("object-contain lymiar-logo-normal", className)}
        style={imgStyle}
        aria-hidden={alt ? undefined : true}
      />
      <Image
        src={srcDark}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn("object-contain lymiar-logo-dark", className)}
        style={imgStyle}
        aria-hidden={true}
      />
    </span>
  );
}
