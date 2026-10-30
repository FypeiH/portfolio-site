"use client";

import { useEffect, useState } from "react";

// Kept out of the prerendered HTML (40 KB budget): fetched only at lg, where the column is visible.
export function HeroPhoto() {
  const [art, setArt] = useState("");

  useEffect(() => {
    const lg = window.matchMedia("(min-width: 64rem)");
    let cancelled = false;
    const load = () => {
      if (!lg.matches) return;
      lg.removeEventListener("change", load);
      void import("@/lib/hero-photo").then(({ HERO_ASCII }) => {
        if (!cancelled) setArt(HERO_ASCII);
      });
    };
    lg.addEventListener("change", load);
    load();
    return () => {
      cancelled = true;
      lg.removeEventListener("change", load);
    };
  }, []);

  return (
    <div className="hidden lg:col-span-4 lg:block">
      <div className="inset-0 flex items-center justify-center overflow-hidden hero-photo-container">
        <pre role="img" aria-label="Filipe's face in ASCII art" className="hero-photo-ascii m-0 max-w-full text-center">
          {art}
        </pre>
      </div>
    </div>
  );
}
