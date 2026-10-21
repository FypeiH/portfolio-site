/**
 * Post-build rewrite of the prerendered HTML (scripts/defer-chunks.ts): Next's framework chunks are
 * `<script async>` tags in the head, so on a fast machine they finish downloading and start evaluating
 * before the first paint. Lighthouse's simulation (Lantern) then counts every such chunk in the LCP
 * chain and replays its download over throttled 4G: LCP 2.1–2.6 s in PageSpeed Insights while the
 * real paint was at ~0.2 s (QA FIL-8, Kaner v2 @ c5e45cb). The chunks are instead inserted by a small
 * inline script at the end of the body, after the first frame, so they can never hold up the paint.
 */

export const LOADER_MARK = "data-deferred-chunks";

/** A parser-inserted async Next chunk, e.g. `<script src="/_next/static/chunks/x.js" id="_R_" async=""></script>`. */
const ASYNC_CHUNK = /<script\b([^>]*\bsrc="\/_next\/[^"]+"[^>]*)><\/script>/g;
const SCRIPT_PRELOAD = /<link\b[^>]*\brel="preload"[^>]*\bas="script"[^>]*\bhref="\/_next\/[^"]+"[^>]*\/?>/g;
const ATTRIBUTE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:="([^"]*)")?/g;

export type DeferResult = { html: string; chunks: number; status: "deferred" | "already" | "no-chunks" };

function attributes(source: string): Record<string, string> {
  return Object.fromEntries([...source.matchAll(ATTRIBUTE)].map(([, name, value]) => [name!, value ?? ""]));
}

/**
 * The loader inserts the chunks once the first contentful paint has been presented (a `paint`
 * PerformanceObserver entry, then a task), so no chunk can start evaluating before Lighthouse's observed
 * LCP. Where paint timing is missing it waits two frames; in a hidden tab, where no frame comes, it loads
 * at once or on the visibility change; after 4 s it loads anyway, so a page that never reports a paint
 * still hydrates. Dynamically inserted scripts are async, like the tags they replace.
 */
function loader(chunks: Record<string, string>[]): string {
  const list = JSON.stringify(chunks).replace(/</g, "\\u003c");
  return (
    `<script ${LOADER_MARK}="">(function(){var c=${list},d=document,done=0;` +
    "function go(){if(done)return;done=1;c.forEach(function(a){var s=d.createElement('script');" +
    "for(var k in a)if(k!=='async')s.setAttribute(k,a[k]);s.async=true;d.head.appendChild(s)})}" +
    "function later(){setTimeout(go,0)}" +
    "if(d.visibilityState==='hidden')return go();" +
    "d.addEventListener('visibilitychange',go,{once:true});setTimeout(go,4000);" +
    "var P=window.PerformanceObserver;" +
    "if(P&&P.supportedEntryTypes&&P.supportedEntryTypes.indexOf('paint')>=0){var o=new P(function(l){" +
    "if(l.getEntriesByName('first-contentful-paint').length){o.disconnect();later()}});o.observe({type:'paint',buffered:true})}" +
    "else requestAnimationFrame(function(){requestAnimationFrame(later)})})()</script>"
  );
}

export function deferChunks(html: string): DeferResult {
  if (html.includes(LOADER_MARK)) return { html, chunks: 0, status: "already" };
  const chunks: Record<string, string>[] = [];
  let out = html.replace(ASYNC_CHUNK, (tag, attrs: string) => {
    const parsed = attributes(attrs);
    // nomodule polyfills never run in the browsers that matter and don't block anything: leave them.
    if (!("async" in parsed) || "nomodule" in parsed || "noModule" in parsed) return tag;
    chunks.push(parsed);
    return "";
  });
  if (chunks.length === 0) return { html, chunks: 0, status: "no-chunks" };
  out = out.replace(SCRIPT_PRELOAD, "");
  if (!out.includes("</body>")) throw new Error("deferChunks: no </body> to insert the loader before");
  out = out.replace("</body>", `${loader(chunks)}</body>`);
  return { html: out, chunks: chunks.length, status: "deferred" };
}
