import { cn } from "@/lib/cn";

const NODES = [
  { x: 60, y: 70, r: 4 },
  { x: 180, y: 40, r: 3 },
  { x: 250, y: 150, r: 5 },
  { x: 120, y: 200, r: 3 },
  { x: 340, y: 80, r: 4, desktopOnly: true },
  { x: 400, y: 210, r: 3, desktopOnly: true },
  { x: 300, y: 260, r: 4 },
  { x: 460, y: 120, r: 5, desktopOnly: true },
] as const;

const EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [0, 3], [3, 2], [2, 6], [1, 4], [4, 2], [4, 7], [7, 5], [5, 6], [2, 5],
];

/** Decorative graph behind the hero (spec D8): inline SVG, no JS. */
export function HeroGraph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 300" aria-hidden="true" focusable="false" className={cn("hero-bg text-accent", className)}>
      <g stroke="currentColor" strokeOpacity="0.18" strokeWidth="1">
        {EDGES.map(([from, to]) => {
          const a = NODES[from];
          const b = NODES[to];
          if (!a || !b) return null;
          const hidden = ("desktopOnly" in a && a.desktopOnly) || ("desktopOnly" in b && b.desktopOnly);
          return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={hidden ? "max-md:hidden" : undefined} />;
        })}
      </g>
      <g fill="currentColor" fillOpacity="0.55">
        {NODES.map((node, index) => (
          <circle
            key={index}
            cx={node.x}
            cy={node.y}
            r={node.r}
            className={cn("hero-node", "desktopOnly" in node && "max-md:hidden")}
            style={{ animationDelay: `${index * 0.7}s` }}
          />
        ))}
      </g>
    </svg>
  );
}
