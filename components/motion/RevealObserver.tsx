"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** IntersectionObserver fallback for browsers without CSS scroll-driven animations (spec §4.3). */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const native = CSS.supports("animation-timeline: view()");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (native || reduce || !("IntersectionObserver" in window)) return;

    const pending = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])"));
    // Anything already in or above the viewport is revealed before the hiding CSS turns on, so nothing flashes.
    const viewportHeight = window.innerHeight;
    for (const el of pending) if (el.getBoundingClientRect().top < viewportHeight) el.dataset.revealed = "";

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.revealed = "";
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    for (const el of pending) if (!("revealed" in el.dataset)) observer.observe(el);
    document.documentElement.classList.add("reveal-io");
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
