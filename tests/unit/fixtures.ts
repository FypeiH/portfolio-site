import type { ContentFiles } from "@/lib/content/rules";
import type { Project } from "@/lib/content/types";

export const publicProject = {
  title: "Crypto Trading Bot",
  summary: "Python bot on Binance Testnet.",
  problem: "Manual trading is slow.",
  solution: "A candle-aligned loop that evaluates indicator rules.",
  visibility: "public",
  role: "individual",
  period: { start: "2025-07", end: "2025-08" },
  stack: ["Python", "CCXT"],
  metrics: [],
  links: { repo: "https://github.com/FypeiH/fidu-bot" },
  featured: true,
  order: 2,
  status: "published",
  updatedAt: "2025-08",
} as const;

export const privateProject = {
  ...publicProject,
  title: "Email Scraper",
  visibility: "private",
  order: 1,
  links: {},
  impact: "It drastically reduced the manual entry of tour visitors from booking emails.",
  diagram: {
    kind: "mermaid",
    source: "content/diagrams/email-scraper.mmd",
    alt: "Email scraper flow from Gmail to the database",
    caption: "Booking emails are read through the Gmail API, matched to a template, validated and inserted.",
  },
} as const;

export function project(overrides: Partial<Project> & { slug: string }): Project {
  return { ...publicProject, stack: [...publicProject.stack], metrics: [], ...overrides } as Project;
}

export function memoryFiles(files: Record<string, string>): ContentFiles {
  return {
    exists: (path) => path in files,
    read: (path) => files[path],
    list: (dir) => Object.keys(files).filter((path) => path.startsWith(`${dir}/`)),
  };
}

const sentence = "This sentence has exactly ten words in it for counting. ";

export function mdxBody(sections: number, words: number): string {
  const headings = Array.from({ length: sections }, (_, i) => `## Section ${i + 1}\n`).join("\n");
  return `---\ntitle: x\n---\n${headings}\n${sentence.repeat(Math.ceil(words / 10))}`;
}
