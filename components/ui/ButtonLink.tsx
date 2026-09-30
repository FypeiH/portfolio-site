import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

const VARIANTS = {
  primary: "bg-accent text-bg hover:bg-accent-strong",
  secondary: "border border-border text-fg hover:border-accent hover:text-accent",
} as const;

type ButtonLinkProps = ComponentPropsWithoutRef<"a"> & { variant?: keyof typeof VARIANTS };

export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return (
    <a
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition-colors",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
