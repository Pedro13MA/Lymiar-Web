/** Mini-previews SVG para /entrar — tokens coral Lymiar (sem stock). */

type SvgProps = { className?: string; title?: string };

/* Cores via CSS vars → seguem light/dark (catalog-premium / dkmode). */
const ink = "var(--hm-ink, #0b1220)";
const muted = "var(--hm-faint, #8b9aab)";
const line = "var(--hm-line, #dde3ea)";
const soft = "var(--preview-soft, var(--hm-bg-soft, #f4f6f8))";
const card = "var(--preview-card, var(--hm-bg-elevated, #fff))";
const tint = "var(--preview-tint, var(--hm-brand-soft, #fff1e8))";
const buySoft = "var(--preview-buy-soft, #ecfdf3)";
const waitSoft = "var(--preview-wait-soft, #fff8eb)";
const coral = "var(--hm-brand, #ff6a1a)";
const buy = "var(--hm-buy, #12b76a)";
const wait = "var(--hm-wait, #f5a524)";

export function FavoritesPreview({ className, title = "Favoritos" }: SvgProps) {
  return (
    <svg viewBox="0 0 320 140" className={className} role="img" aria-label={title} fill="none">
      <rect width="320" height="140" rx="12" fill={soft} />
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(16 ${16 + i * 56})`}>
          <rect width="288" height="48" rx="10" fill={card} stroke={line} />
          <rect x="10" y="10" width="28" height="28" rx="6" fill={tint} />
          <path
            d="M24 18.5c-1.2-1.4-3.2-1.4-4.2-.2-.9 1.1-.7 2.8.4 3.8L24 26l3.8-3.9c1.1-1 .3-2.7-.4-3.8-1-1.2-3-1.2-4.2.2"
            fill={coral}
          />
          <rect x="50" y="14" width="120" height="8" rx="4" fill={ink} opacity="0.85" />
          <rect x="50" y="28" width="72" height="6" rx="3" fill={muted} opacity="0.45" />
          <text x="250" y="30" fill={buy} fontSize="12" fontFamily="system-ui" fontWeight="600">
            €429
          </text>
        </g>
      ))}
    </svg>
  );
}

export function AlertsPreview({ className, title = "Alertas" }: SvgProps) {
  return (
    <svg viewBox="0 0 320 140" className={className} role="img" aria-label={title} fill="none">
      <rect width="320" height="140" rx="12" fill={soft} />
      <rect x="20" y="28" width="280" height="84" rx="12" fill={card} stroke={line} />
      <circle cx="52" cy="70" r="18" fill={buySoft} />
      <path
        d="M52 58c-4 0-7 3-7 7v8l-5 7h24l-5-7v-8c0-4-3-7-7-7z"
        stroke={buy}
        strokeWidth="2"
        fill="none"
      />
      <rect x="84" y="52" width="140" height="8" rx="4" fill={ink} opacity="0.85" />
      <rect x="84" y="68" width="160" height="6" rx="3" fill={muted} opacity="0.4" />
      <rect x="84" y="84" width="88" height="14" rx="7" fill={buySoft} />
      <text x="96" y="94" fill={buy} fontSize="9" fontFamily="system-ui" fontWeight="600">
        Comprar agora
      </text>
    </svg>
  );
}

export function TimelinePreview({ className, title = "Timeline" }: SvgProps) {
  return (
    <svg viewBox="0 0 320 140" className={className} role="img" aria-label={title} fill="none">
      <rect width="320" height="140" rx="12" fill={soft} />
      <line x1="40" y1="40" x2="40" y2="110" stroke={line} strokeWidth="2" />
      {[40, 70, 100].map((y, i) => (
        <g key={y}>
          <circle cx="40" cy={y} r={i === 0 ? 7 : 5} fill={i === 0 ? coral : muted} />
          <rect x="60" y={y - 10} width={i === 0 ? 200 : 160} height="8" rx="4" fill={ink} opacity={i === 0 ? 0.85 : 0.35} />
          <rect x="60" y={y + 4} width={i === 0 ? 120 : 90} height="5" rx="2.5" fill={muted} opacity="0.35" />
        </g>
      ))}
    </svg>
  );
}

export function CartPreview({ className, title = "Carrinho" }: SvgProps) {
  return (
    <svg viewBox="0 0 320 140" className={className} role="img" aria-label={title} fill="none">
      <rect width="320" height="140" rx="12" fill={soft} />
      <rect x="20" y="20" width="280" height="100" rx="12" fill={card} stroke={line} />
      <rect x="36" y="36" width="36" height="36" rx="8" fill={tint} />
      <rect x="84" y="40" width="100" height="8" rx="4" fill={ink} opacity="0.8" />
      <rect x="84" y="56" width="64" height="6" rx="3" fill={muted} opacity="0.4" />
      <text x="250" y="52" textAnchor="end" fill={ink} fontSize="13" fontFamily="system-ui" fontWeight="700">
        €1.248
      </text>
      <rect x="36" y="88" width="180" height="18" rx="9" fill={buySoft} />
      <text x="48" y="100" fill={buy} fontSize="10" fontFamily="system-ui" fontWeight="600">
        Acompanha preços após fechar
      </text>
    </svg>
  );
}

export function ProjectsPreview({ className, title = "Projetos" }: SvgProps) {
  return (
    <svg viewBox="0 0 320 140" className={className} role="img" aria-label={title} fill="none">
      <rect width="320" height="140" rx="12" fill={soft} />
      <text x="20" y="28" fill={muted} fontSize="11" fontFamily="system-ui" fontWeight="600">
        PC Gaming
      </text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${20 + (i % 2) * 150} ${40 + Math.floor(i / 2) * 44})`}>
          <rect width="130" height="36" rx="8" fill={card} stroke={i === 0 ? coral : line} />
          <rect x="10" y="12" width="70" height="6" rx="3" fill={ink} opacity="0.55" />
          <rect x="10" y="22" width="44" height="5" rx="2.5" fill={muted} opacity="0.35" />
        </g>
      ))}
    </svg>
  );
}

export function ListsPreview({ className, title = "Listas" }: SvgProps) {
  return (
    <svg viewBox="0 0 320 140" className={className} role="img" aria-label={title} fill="none">
      <rect width="320" height="140" rx="12" fill={soft} />
      {["Viagem", "Escritório", "Casa"].map((label, i) => (
        <g key={label} transform={`translate(20 ${20 + i * 36})`}>
          <rect width="280" height="28" rx="8" fill={card} stroke={line} />
          <rect x="10" y="8" width="12" height="12" rx="3" fill={i === 0 ? coral : line} />
          <text x="32" y="18" fill={ink} fontSize="11" fontFamily="system-ui" fontWeight="600">
            {label}
          </text>
          <text x="250" y="18" fill={muted} fontSize="10" fontFamily="system-ui">
            {3 + i * 2} itens
          </text>
        </g>
      ))}
    </svg>
  );
}

export function ComparePreview({ className, title = "Comparador" }: SvgProps) {
  return (
    <svg viewBox="0 0 320 140" className={className} role="img" aria-label={title} fill="none">
      <rect width="320" height="140" rx="12" fill={soft} />
      <rect x="24" y="24" width="120" height="92" rx="10" fill={card} stroke={line} />
      <rect x="176" y="24" width="120" height="92" rx="10" fill={card} stroke={coral} />
      <rect x="40" y="40" width="88" height="8" rx="4" fill={ink} opacity="0.5" />
      <rect x="40" y="56" width="64" height="6" rx="3" fill={muted} opacity="0.35" />
      <rect x="40" y="80" width="56" height="16" rx="8" fill={waitSoft} />
      <text x="52" y="91" fill={wait} fontSize="9" fontFamily="system-ui" fontWeight="600">
        Esperar
      </text>
      <rect x="192" y="40" width="88" height="8" rx="4" fill={ink} opacity="0.7" />
      <rect x="192" y="56" width="64" height="6" rx="3" fill={muted} opacity="0.35" />
      <rect x="192" y="80" width="72" height="16" rx="8" fill={buySoft} />
      <text x="204" y="91" fill={buy} fontSize="9" fontFamily="system-ui" fontWeight="600">
        Comprar
      </text>
    </svg>
  );
}

export function HistoryPreview({ className, title = "Histórico" }: SvgProps) {
  return (
    <svg viewBox="0 0 320 140" className={className} role="img" aria-label={title} fill="none">
      <rect width="320" height="140" rx="12" fill={soft} />
      <rect x="20" y="20" width="280" height="100" rx="12" fill={card} stroke={line} />
      <path
        d="M40 90 C70 86 90 70 120 74 C150 78 170 48 200 52 C230 56 250 68 280 62"
        stroke={coral}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="280" cy="62" r="5" fill={buy} />
      <text x="40" y="40" fill={muted} fontSize="10" fontFamily="system-ui">
        90 dias observados
      </text>
    </svg>
  );
}
