"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const PREVIOUS_ROUTE_KEY = "nav:prev";
const CURRENT_ROUTE_KEY = "nav:cur";

/** Remembers the previous route so BackLink can return to the exact card (spec §2.7). */
export function RouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const current = sessionStorage.getItem(CURRENT_ROUTE_KEY);
    if (current === pathname) return;
    if (current) sessionStorage.setItem(PREVIOUS_ROUTE_KEY, current);
    sessionStorage.setItem(CURRENT_ROUTE_KEY, pathname);
  }, [pathname]);

  return null;
}
