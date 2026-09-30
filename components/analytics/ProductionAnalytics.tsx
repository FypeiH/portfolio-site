import { Analytics } from "@vercel/analytics/next";
import { isProductionDeployment } from "@/lib/env";

/**
 * Vercel Analytics on production deployments only. Outside production builds, next.config.ts aliases
 * the package to AnalyticsOff, because an unrendered client component would still ship its chunk.
 */
export function ProductionAnalytics() {
  return isProductionDeployment() ? <Analytics /> : null;
}
