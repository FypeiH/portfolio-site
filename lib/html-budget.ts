/**
 * Build-time half of the HTML size budget (scripts/lighthouse.mjs enforces the served size, headers
 * included, which is ~0.3 KB more): the gzip size of every prerendered HTML page.
 */
import { gzipSync } from "node:zlib";
import budget from "./html-budget.json";

export const HTML_BUDGET_KB = budget.htmlServedKb;

export type HtmlSize = { file: string; gzipKb: number };

export const gzipKb = (html: string): number => Number((gzipSync(html).length / 1024).toFixed(1));

export function htmlSizes(pages: { file: string; html: string }[]): HtmlSize[] {
  return pages.map(({ file, html }) => ({ file, gzipKb: gzipKb(html) })).sort((a, b) => b.gzipKb - a.gzipKb);
}

export const overHtmlBudget = (sizes: HtmlSize[], limitKb: number = HTML_BUDGET_KB): HtmlSize[] =>
  sizes.filter((size) => size.gzipKb > limitKb);
