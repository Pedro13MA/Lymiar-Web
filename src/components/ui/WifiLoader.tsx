import "./WifiLoader.css";

type Props = {
  /** Texto sob o loader (default: A carregar) */
  text?: string;
  /** `sm` para dropdowns; `md` para páginas */
  size?: "sm" | "md";
  className?: string;
};

/**
 * Loader animado (anéis) para pesquisa / carregamento de produtos.
 */
export function WifiLoader({
  text = "A carregar",
  size = "md",
  className = "",
}: Props) {
  return (
    <div
      className={`wifi-loader wifi-loader--${size}${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <svg viewBox="0 0 86 86" className="wifi-loader__circle-outer" aria-hidden>
        <circle r="40" cy="43" cx="43" className="wifi-loader__back" />
        <circle r="40" cy="43" cx="43" className="wifi-loader__front" />
      </svg>
      <svg viewBox="0 0 60 60" className="wifi-loader__circle-middle" aria-hidden>
        <circle r="27" cy="30" cx="30" className="wifi-loader__back" />
        <circle r="27" cy="30" cx="30" className="wifi-loader__front" />
      </svg>
      <svg viewBox="0 0 34 34" className="wifi-loader__circle-inner" aria-hidden>
        <circle r="14" cy="17" cx="17" className="wifi-loader__back" />
        <circle r="14" cy="17" cx="17" className="wifi-loader__front" />
      </svg>
      <div className="wifi-loader__text" data-text={text} />
    </div>
  );
}

/** Centro de página / secção com o loader. */
export function WifiLoaderBlock({
  text = "A carregar",
  size = "md",
  className = "",
}: Props) {
  return (
    <div
      className={`wifi-loader-block${className ? ` ${className}` : ""}`}
      aria-busy="true"
    >
      <WifiLoader text={text} size={size} />
    </div>
  );
}
