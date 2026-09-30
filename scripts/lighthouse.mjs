// Runs Lighthouse (mobile, default throttling) against a running `pnpm start` server and
// checks the spec budget. Usage: BASE_URL=http://localhost:3100 pnpm lighthouse [path...]
// Needs Chrome: set CHROME_PATH if it is not auto-detected.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/projects/email-scraper"];
const outDir = ".lighthouse";
mkdirSync(outDir, { recursive: true });

const budget = { performance: 95, accessibility: 100, "best-practices": 100, seo: 100, lcpMs: 2000, cls: 0.05, tbtMs: 150 };
const jsBudgetKb = (path) => (path === "/" ? 150 : 120);
let failed = false;

for (const path of paths) {
  const name = path === "/" ? "home" : path.replaceAll("/", "_").replace(/^_/, "");
  const out = `${outDir}/${name}.json`;
  execFileSync(
    "pnpm",
    ["exec", "lighthouse", base + path, "--quiet", "--output=json", `--output-path=${out}`,
      "--chrome-flags=--headless=new --no-sandbox"],
    { stdio: "inherit" },
  );
  const lhr = JSON.parse(readFileSync(out, "utf8"));
  const score = (id) => Math.round((lhr.categories[id]?.score ?? 0) * 100);
  const audit = (id) => lhr.audits[id]?.numericValue ?? NaN;
  const jsKb =
    (lhr.audits["network-requests"]?.details?.items ?? [])
      .filter((item) => item.resourceType === "Script")
      .reduce((sum, item) => sum + (item.transferSize ?? 0), 0) / 1024;

  const result = {
    performance: score("performance"),
    accessibility: score("accessibility"),
    "best-practices": score("best-practices"),
    seo: score("seo"),
    lcpMs: Math.round(audit("largest-contentful-paint")),
    cls: Number(audit("cumulative-layout-shift").toFixed(3)),
    tbtMs: Math.round(audit("total-blocking-time")),
    jsKb: Number(jsKb.toFixed(1)),
  };
  const misses = [
    ...["performance", "accessibility", "best-practices", "seo"].filter((k) => result[k] < budget[k]),
    ...(result.lcpMs >= budget.lcpMs ? ["lcp"] : []),
    ...(result.cls >= budget.cls ? ["cls"] : []),
    ...(result.tbtMs >= budget.tbtMs ? ["tbt"] : []),
    ...(result.jsKb > jsBudgetKb(path) ? ["js"] : []),
  ];
  console.log(path, JSON.stringify(result), misses.length ? `OVER BUDGET: ${misses.join(", ")}` : "within budget");
  if (misses.length) failed = true;
}
process.exitCode = failed ? 1 : 0;
