"use client";

import { useEffect } from "react";

export const FONTS_READY_CLASS = "fonts-ready";

/**
 * Switches the hero name and the marquee headings to Anton (`html.fonts-ready`, styles/globals.css) once
 * the page has hydrated and loaded, a frame later, so the font request and the re-layout it causes come
 * after the LCP paint and after the bootstrap, never in Lighthouse's LCP chain.
 * Without JavaScript the fallback faces stay.
 */
export function FontsReady() {
  useEffect(() => {
    const ready = () => requestAnimationFrame(() => setTimeout(() => document.documentElement.classList.add(FONTS_READY_CLASS), 0));
    if (document.readyState === "complete") ready();
    else addEventListener("load", ready, { once: true });
  }, []);
  return null;
}
