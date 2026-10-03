/**
 * `pnpm audit:prod`: `pnpm audit --prod` with NO ignored advisories. package.json's
 * pnpm.auditConfig.ignoreGhsas (the dev-only braces advisory) would also hide a match in the
 * production tree, so the audit runs on a temp copy of the manifest without auditConfig, next to the
 * real lockfile (all `pnpm audit` reads). Exits 1 on any production advisory or a failed audit.
 * `--all` audits dev dependencies too (shows the ignore really is lifted). Needs the registry (CI: run
 * on every push; it does not run in the Vercel build, which must not depend on advisory feeds).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const all = process.argv.includes("--all");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-prod-"));
try {
  const manifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
  if (manifest.pnpm) delete manifest.pnpm.auditConfig;
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(manifest, null, 2));
  for (const file of ["pnpm-lock.yaml", "pnpm-workspace.yaml", ".npmrc"]) if (fs.existsSync(file)) fs.copyFileSync(file, path.join(dir, file));
  const args = ["audit", "--json", ...(all ? [] : ["--prod"])];
  const result = spawnSync("pnpm", args, { cwd: dir, encoding: "utf8", shell: process.platform === "win32" });
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    console.error(`audit:prod: pnpm ${args.join(" ")} gave no report (exit ${result.status}):\n${result.stderr || result.stdout}`);
    process.exit(1);
  }
  const advisories = Object.values(report.advisories ?? {});
  const scope = all ? "all dependencies" : "production dependencies";
  if (advisories.length > 0) {
    console.error(`audit:prod: ${advisories.length} advisories in ${scope} (nothing ignored):`);
    for (const a of advisories) console.error(`  ${a.severity} ${a.module_name} ${a.github_advisory_id ?? a.id}: ${a.title}`);
    process.exit(1);
  }
  console.log(`audit:prod: no known vulnerabilities in ${scope} (${report.metadata?.dependencies ?? "?"} packages, nothing ignored).`);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
