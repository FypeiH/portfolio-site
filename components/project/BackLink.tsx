"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { PREVIOUS_ROUTE_KEY } from "@/components/motion/RouteTracker";

/** Returns to the exact card when the visitor came from the home page, else links to /#projects (spec §2.7). */
export function BackLink({ label }: { label: string }) {
  const router = useRouter();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (sessionStorage.getItem(PREVIOUS_ROUTE_KEY) !== "/") return;
    event.preventDefault();
    router.back();
  };

  return (
    <Link href="/#projects" onClick={onClick} className="inline-flex min-h-11 items-center text-sm text-muted hover:text-fg">
      ← {label}
    </Link>
  );
}
