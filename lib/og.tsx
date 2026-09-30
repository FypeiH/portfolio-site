import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReactNode } from "react";

export const OG_SIZE = { width: 1200, height: 630 };

const ASSETS = path.join(process.cwd(), "assets/og");
export const ogColors = { bg: "#0b0d10", fg: "#e7e9ec", muted: "#a3acb7", accent: "#7cc4fa", border: "#262c35" };

export async function loadOgFonts() {
  const [regular, bold] = await Promise.all([
    readFile(path.join(ASSETS, "inter-latin-400-normal.woff")),
    readFile(path.join(ASSETS, "inter-latin-700-normal.woff")),
  ]);
  return [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

export async function loadOgAvatar(): Promise<string> {
  const photo = await readFile(path.join(ASSETS, "avatar.jpg"));
  return `data:image/jpeg;base64,${photo.toString("base64")}`;
}

/** Shared 1200×630 frame: dark background with the hero's graph motif. */
export function OgFrame({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: ogColors.bg, color: ogColors.fg, fontFamily: "Inter", padding: 72 }}>
      <svg width="520" height="300" viewBox="0 0 520 300" style={{ position: "absolute", right: 0, top: 0, opacity: 0.5 }}>
        <g stroke={ogColors.accent} strokeOpacity="0.3">
          <line x1="60" y1="70" x2="180" y2="40" />
          <line x1="180" y1="40" x2="250" y2="150" />
          <line x1="250" y1="150" x2="460" y2="120" />
          <line x1="250" y1="150" x2="300" y2="260" />
        </g>
        <g fill={ogColors.accent}>
          <circle cx="60" cy="70" r="5" />
          <circle cx="180" cy="40" r="4" />
          <circle cx="250" cy="150" r="6" />
          <circle cx="460" cy="120" r="5" />
          <circle cx="300" cy="260" r="4" />
        </g>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%" }}>{children}</div>
    </div>
  );
}

