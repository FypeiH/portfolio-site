import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

const VARIANTS = {
  primary: "ui-btn ui-btn-primary",
  secondary: "ui-btn ui-btn-outline",
} as const;

type ButtonLinkProps = ComponentPropsWithoutRef<"a"> & { variant?: keyof typeof VARIANTS };

export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return <a className={cn(VARIANTS[variant], className)} {...props} />;
}
