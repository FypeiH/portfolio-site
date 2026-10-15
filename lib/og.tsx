import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { ReactElement, ReactNode } from "react";
import { repoFiles } from "@/lib/content/repo-files";
import { allowedShippedMarkers } from "@/lib/content/scan";
import { assertOgText } from "@/lib/og-guard";
import { OG_SIZE } from "@/lib/og-size";

export { OG_SIZE } from "@/lib/og-size";

const ASSETS = path.join(process.cwd(), "assets/og");

/** visual-direction.md §2 ("Dark + Brutal"): warm-neutral greys, one signal orange. */
export const ogColors = {
  bg: "#0a0a0a",
  surface: "#141414",
  fg: "#f2f2f2",
  muted: "#a3a3a3",
  subtle: "#858585",
  border: "#2e2e2e",
  borderStrong: "#6b6b6b",
  accent: "#ff5a1f",
  accentInk: "#0a0a0a",
};

/**
 * Satori takes TTF/OTF/WOFF only (no woff2), so the headings use a TTF subset of Anton (OFL,
 * assets/fonts/Anton-OFL.txt; Latin-1 + typographic punctuation, 17 KB) next to the Inter WOFFs.
 * Read from disk at prerender only: none of these files reach a client bundle.
 */
export async function loadOgFonts() {
  const [regular, bold, anton] = await Promise.all([
    readFile(path.join(ASSETS, "inter-latin-400-normal.woff")),
    readFile(path.join(ASSETS, "inter-latin-700-normal.woff")),
    readFile(path.join(ASSETS, "anton-latin-400.ttf")),
  ]);
  return [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Anton", data: anton, weight: 400 as const, style: "normal" as const },
  ];
}

export async function loadOgAvatar(): Promise<string> {
  const photo = await readFile(path.join(ASSETS, "avatar.jpg"));
  return `data:image/jpeg;base64,${photo.toString("base64")}`;
}

/** Small uppercase label with an orange square (the site's mono labels; Inter here, Satori has no system mono). */
export function OgLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", fontSize: 24, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: ogColors.muted }}>
      <div style={{ width: 16, height: 16, background: ogColors.accent, marginRight: 16 }} />
      {children}
    </div>
  );
}

/**
 * Shared 1200×630 frame: black page, a 2 px light border with a hard orange offset shadow (no blur,
 * no radius), and a footer rule with the site address.
 */
export function OgFrame({ children, footer }: { children: ReactNode; footer: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: ogColors.bg, color: ogColors.fg, fontFamily: "Inter", padding: "40px 52px 52px 40px" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: ogColors.bg,
          border: `3px solid ${ogColors.fg}`,
          boxShadow: `12px 12px 0 0 ${ogColors.accent}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1, padding: "40px 56px" }}>{children}</div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: `2px solid ${ogColors.border}`,
            padding: "18px 56px",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: ogColors.subtle,
          }}
        >
          <div style={{ display: "flex" }}>{footer}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {[ogColors.accent, ogColors.borderStrong, ogColors.border].map((color) => (
              <div key={color} style={{ width: 14, height: 14, background: color }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ImageResponse behind the text guard: a strict build fails at prerender when the card would draw a
 * placeholder marker (lib/og-guard.ts), as the output scan does for HTML.
 */
export async function ogImageResponse(route: string, element: ReactElement): Promise<ImageResponse> {
  assertOgText(route, element, { allowed: () => allowedShippedMarkers(repoFiles()) });
  return new ImageResponse(element, { ...OG_SIZE, fonts: await loadOgFonts() });
}
