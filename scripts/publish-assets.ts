/**
 * Runs before every dev server and build (package.json): copies the rendered diagrams and covers of
 * the projects this build shows from assets/rendered/ into public/ (drafts only with SHOW_DRAFTS=true),
 * so a production build never serves a draft's assets. See lib/rendered-assets.ts.
 */
import { publishAssets } from "../lib/publish-assets";

const showDrafts = process.env.SHOW_DRAFTS === "true";
const paths = publishAssets(process.cwd(), showDrafts);
console.log(`publish-assets: ${paths.length} files into public/ (${showDrafts ? "drafts included" : "published projects only"})`);
