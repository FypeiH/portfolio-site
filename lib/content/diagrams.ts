import { createHash } from "node:crypto";

const HASH_COMMENT = /<!-- src-sha256: ([a-f0-9]{64}) -->/;

export function sourceHash(mermaidSource: string): string {
  return createHash("sha256").update(mermaidSource).digest("hex");
}

export function hashComment(mermaidSource: string): string {
  return `<!-- src-sha256: ${sourceHash(mermaidSource)} -->`;
}

export function isDiagramCurrent(mermaidSource: string, svg: string): boolean {
  return svg.match(HASH_COMMENT)?.[1] === sourceHash(mermaidSource);
}

/** "content/diagrams/fidu-bot.mmd" → "/diagrams/fidu-bot.svg" */
export function renderedDiagramPath(source: string): string {
  return source.replace(/^content\/diagrams\/(.+)\.mmd$/, "/diagrams/$1.svg");
}

export interface DiagramImage {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}

/** Intrinsic size of a rendered SVG, read from its viewBox so the <img> reserves space (no CLS). */
export function svgSize(svg: string): { width: number; height: number } | undefined {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1]?.trim().split(/[\s,]+/).map(Number);
  const [, , width, height] = viewBox ?? [];
  return width && height ? { width: Math.ceil(width), height: Math.ceil(height) } : undefined;
}
