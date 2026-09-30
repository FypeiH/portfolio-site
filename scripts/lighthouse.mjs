// Runs Lighthouse (mobile preset, default throttling) against a running `pnpm start` server and
// checks the budgets signed off by the PM (FIL-8). Official numbers come from the Vercel preview.
//
//   BASE_URL=http://localhost:3100 CHROME_PATH=/usr/bin/google-chrome RUNS=3 pnpm lighthouse [path...]
//   EXPECT_INDEXABLE=true also fails on the noindex audit (use it against production).
//
// JS size gate: Brotli (quality 11) computed locally from each script Lighthouse saw loaded, the
// local proxy for what Vercel serves. Gzip (level 9) is reported for information only.
// "Root" = Next's rootMainFiles from .next/build-manifest.json (React, Next runtime, Turbopack), shared
// by every route; "non-root" = every other script on the page. jsServedKb is Lighthouse's transfer size as served
// by `next start` (gzip, headers included), also for information.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const base = process.env.BASE_URL ?? "http://localhost:3000";
/** Budgets are evaluated on the run with the median LCP (Sonar); every run is printed. */
const runs = Number(process.env.RUNS ?? 5);
/** Set EXPECT_INDEXABLE=true against a production deployment; everywhere else noindex is intended. */
const expectIndexable = process.env.EXPECT_INDEXABLE === "true";
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/projects/email-scraper"];
const outDir = ".lighthouse";
mkdirSync(outDir, { recursive: true });

const KB = 1024;
const BUDGET = {
  performance: 95,
  accessibility: 100,
  "best-practices": 100,
  seo: 100,
  lcpMs: 2000,
  cls: 0.05,
  tbtMs: 150,
  /** Brotli JS per page: 150 KB on the home page, 125 KB on case studies. */
  jsBrotliKb: (path) => (path === "/" ? 150 : 125),
  /** Brotli JS outside Next's rootMainFiles (app code and route-specific chunks), home page only. */
  nonRootBrotliKb: { "/": 35 },
};

const manifestFile = ".next/build-manifest.json";
const rootFiles = new Set(
  existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")).rootMainFiles.map((f) => `/_next/${f}`) : [],
);

const kb = (bytes) => Number((bytes / KB).toFixed(1));

/** The server may drop an idle keep-alive socket while Lighthouse runs, so retry once. */
async function download(url, attempts = 2) {
  try {
    return Buffer.from(await (await fetch(url)).arrayBuffer());
  } catch (error) {
    if (attempts <= 1) throw error;
    return download(url, attempts - 1);
  }
}

async function jsSizes(lhr) {
  const scripts = (lhr.audits["network-requests"]?.details?.items ?? []).filter(
    (item) => item.resourceType === "Script" && item.statusCode === 200,
  );
  const totals = { gzip: 0, brotli: 0, nonRootGzip: 0, nonRootBrotli: 0 };
  for (const { url } of scripts) {
    const body = await download(url);
    const gzip = gzipSync(body, { level: 9 }).length;
    const brotli = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
    totals.gzip += gzip;
    totals.brotli += brotli;
    if (!rootFiles.has(new URL(url).pathname)) {
      totals.nonRootGzip += gzip;
      totals.nonRootBrotli += brotli;
    }
  }
  return {
    scripts: scripts.length,
    jsGzipKb: kb(totals.gzip),
    jsBrotliKb: kb(totals.brotli),
    nonRootGzipKb: kb(totals.nonRootGzip),
    nonRootBrotliKb: kb(totals.nonRootBrotli),
    rootBrotliKb: kb(totals.brotli - totals.nonRootBrotli),
  };
}

function seoIgnoringNoindex(lhr) {
  const refs = lhr.categories.seo.auditRefs.filter((ref) => ref.weight > 0 && ref.id !== "is-crawlable");
  const weight = refs.reduce((sum, ref) => sum + ref.weight, 0);
  const score = refs.reduce((sum, ref) => sum + ref.weight * (lhr.audits[ref.id]?.score ?? 1), 0);
  return Math.round((score / weight) * 100);
}

function overBudget(path, r) {
  const nonRootLimit = BUDGET.nonRootBrotliKb[path];
  return [
    ...["performance", "accessibility", "best-practices"].filter((k) => r[k] < BUDGET[k]),
    ...((expectIndexable ? r.seo : r.seoWithoutNoindex) < BUDGET.seo ? ["seo"] : []),
    ...(r.lcpMs > BUDGET.lcpMs ? [`lcp ${r.lcpMs} > ${BUDGET.lcpMs} ms`] : []),
    ...(r.cls >= BUDGET.cls ? ["cls"] : []),
    ...(r.tbtMs >= BUDGET.tbtMs ? ["tbt"] : []),
    ...(r.jsBrotliKb > BUDGET.jsBrotliKb(path) ? [`js ${r.jsBrotliKb} > ${BUDGET.jsBrotliKb(path)} KB br`] : []),
    ...(nonRootLimit !== undefined && r.nonRootBrotliKb > nonRootLimit
      ? [`non-root js ${r.nonRootBrotliKb} > ${nonRootLimit} KB br`]
      : []),
  ];
}

let failed = false;
for (const path of paths) {
  const results = [];
  for (let run = 1; run <= runs; run++) {
    const name = `${path === "/" ? "home" : path.replaceAll("/", "_").replace(/^_/, "")}-${run}`;
    const out = `${outDir}/${name}.json`;
    execFileSync(
      "pnpm",
      ["exec", "lighthouse", base + path, "--quiet", "--output=json", `--output-path=${out}`, "--chrome-flags=--headless=new --no-sandbox"],
      { stdio: "inherit" },
    );
    const lhr = JSON.parse(readFileSync(out, "utf8"));
    const score = (id) => Math.round((lhr.categories[id]?.score ?? 0) * 100);
    const audit = (id) => lhr.audits[id]?.numericValue ?? NaN;
    const result = {
      /** Outside VERCEL_ENV=production every page is noindex on purpose; that audit alone is not a failure. */
      seoWithoutNoindex: seoIgnoringNoindex(lhr),
      performance: score("performance"),
      accessibility: score("accessibility"),
      "best-practices": score("best-practices"),
      seo: score("seo"),
      lcpMs: Math.round(audit("largest-contentful-paint")),
      cls: Number(audit("cumulative-layout-shift").toFixed(3)),
      tbtMs: Math.round(audit("total-blocking-time")),
      jsServedKb: kb(
        (lhr.audits["network-requests"]?.details?.items ?? [])
          .filter((item) => item.resourceType === "Script")
          .reduce((sum, item) => sum + (item.transferSize ?? 0), 0),
      ),
      ...(await jsSizes(lhr)),
    };
    results.push(result);
    console.log(`${path} run ${run}`, JSON.stringify(result));
  }
  const median = [...results].sort((a, b) => a.lcpMs - b.lcpMs)[Math.floor(results.length / 2)];
  const misses = overBudget(path, median);
  console.log(
    `${path} median run (LCP ${median.lcpMs} ms; all: ${results.map((r) => r.lcpMs).join("/")})`,
    misses.length ? `OVER BUDGET: ${misses.join("; ")}` : "within budget",
  );
  if (misses.length) failed = true;
}
process.exitCode = failed ? 1 : 0;
