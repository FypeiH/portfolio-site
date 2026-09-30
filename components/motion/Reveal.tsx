import type { ComponentPropsWithoutRef, CSSProperties, ElementType } from "react";

type RevealProps<T extends ElementType> = {
  as?: T;
  variant?: "up" | "fade";
  /** Stagger position; drives the `--i` custom property used by motion.css. */
  index?: number;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

export function Reveal<T extends ElementType = "div">({ as, variant = "up", index, style, ...rest }: RevealProps<T>) {
  const Tag: ElementType = as ?? "div";
  const staggered = index === undefined ? style : ({ ...style, "--i": index } as CSSProperties);
  return <Tag data-reveal={variant} style={staggered} {...rest} />;
}
