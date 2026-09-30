import "server-only";

import { isVercelProduction } from "./build-env";

/** Inlined at build time (next.config.ts `env`): a production build stays one regardless of runtime env. */
export function isProductionDeployment(): boolean {
  return isVercelProduction(process.env.VERCEL_ENV);
}
