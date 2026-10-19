const CELL = 40;
const SIZE = 400;
const LINES = Array.from({ length: SIZE / CELL + 1 }, (_, i) => i * CELL);

/**
 * The hero's visual: a ruled grid with hard-edged squares in the site palette. Inline SVG, so no image
 * request, no JS and nothing for the LCP to wait on; decorative, hence aria-hidden.
 */
export function HeroGrid({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden="true" focusable="false" className={className}>
      <g className="stroke-border" strokeWidth="1">
        {LINES.map((at) => (
          <g key={at}>
            <line x1={at} y1="0" x2={at} y2={SIZE} />
            <line x1="0" y1={at} x2={SIZE} y2={at} />
          </g>
        ))}
      </g>
      <rect x="200" y="40" width="160" height="160" className="fill-surface-strong" />
      <rect x="132" y="132" width="160" height="160" className="fill-accent" />
      <rect x="120" y="120" width="160" height="160" className="fill-bg stroke-fg" strokeWidth="4" />
      <rect x="40" y="280" width="80" height="80" className="fill-surface-strong" />
      <rect x="320" y="280" width="40" height="40" className="fill-border-strong" />
      <rect x="160" y="160" width="40" height="40" className="fill-accent" />
      <rect x="0" y="0" width={CELL} height={CELL} className="fill-fg" />
    </svg>
  );
}
