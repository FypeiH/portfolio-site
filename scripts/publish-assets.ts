/**
 * Runs before every dev server and build (package.json): copies the rendered diagrams and covers of
 * the projects this build shows from assets/rendered/ into public/ (drafts only with SHOW_DRAFTS=true),
 * so a production build never serves a draft's assets. See lib/rendered-assets.ts.
 */
import { MissingAssetError, publishAssets } from "../lib/publish-assets";

const showDrafts = process.env.SHOW_DRAFTS === "true";
let paths: string[];
try {
  paths = publishAssets(process.cwd(), showDrafts);
} catch (error) {
  if (!(error instanceof MissingAssetError)) throw error;
  console.error(error.message);
  process.exit(1);
}
console.log(`publish-assets: ${paths.length} files into public/ (${showDrafts ? "drafts included" : "published projects only"})`);
