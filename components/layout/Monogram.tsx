import { monogramLayout } from "@/lib/monogram";

/** The FB monogram as inline SVG (no request, no font). Decorative: the link around it carries the name. */
export function Monogram({ className }: { className?: string }) {
  const { size, tile, letters, border, glyphs } = monogramLayout("full");
  const inset = border ? border.width / 2 : 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false" className={className}>
      <rect x={inset} y={inset} width={size - 2 * inset} height={size - 2 * inset} fill={tile} stroke={border?.colour} strokeWidth={border?.width} />
      <g fill={letters}>
        {glyphs.map((glyph) => (
          <path key={glyph.transform} transform={glyph.transform} d={glyph.d} />
        ))}
      </g>
    </svg>
  );
}
