/**
 * Vercel build entry (vercel.json → `pnpm build:vercel`): production deployments run the strict
 * build (placeholder guard + rendered-output check); previews run the plain build, drafts hidden
 * unless the preview env sets SHOW_DRAFTS=true. Flags are inlined at build time (next.config.ts).
 */
import { spawnSync } from "node:child_process";

// Same test as isVercelProduction() in lib/build-env.ts, the source of truth (a .ts module, not importable from this plain .mjs).
const script = process.env.VERCEL_ENV === "production" ? "build:production" : "build";
console.log(`build:vercel: VERCEL_ENV=${process.env.VERCEL_ENV ?? "(unset)"} → pnpm ${script}`);
const result = spawnSync("pnpm", ["run", script], { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
