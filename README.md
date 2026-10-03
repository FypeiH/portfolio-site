# portfolio-site

Filipe Bravo's portfolio: Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, MDX case studies and typed content validated with zod.

## Run locally

Requires Node 22+ and pnpm 10.

```bash
pnpm install
pnpm dev            # http://localhost:3000, published projects only
pnpm dev:preview    # also renders draft projects
```

## Content

Everything visitors read lives in `content/` (`site.ts`, `profile.ts`, `experience.ts`, `skills.ts`, `projects/*.mdx`, `diagrams/*.mmd`). The schemas are in `lib/content/schema.ts`, and the cross-file rules (references, featured order, diagram hashes, placeholders, body length) are in `lib/content/rules.ts`. `pnpm content:check` runs the same checks without building.

Placeholders use the `{{TODO: ...}}` form. They are allowed in drafts but never rendered. The strict guard (`lib/content/scan.ts`) scans every file under `content/` except drafts, diagrams used only by drafts and files or folders whose names start with `_`. It decodes HTML entities and JS escapes, joins markers split across lines and flags `{{…}}`, `[TODO…]`, `TODO`, `TBD`, `FIXME` and `lorem ipsum`. Comments (TS/JS, YAML, MDX, Mermaid `%%`) are skipped because they never render. `pnpm content:check` uses the same file set and scan, so the two can't disagree.

Case rules: bare `TODO` counts only in uppercase, so "built a Todo app" is fine. `todo:` and `[todo…]` count in any case, and so do `TBD`, `FIXME` and `lorem ipsum`. Before matching, text is normalized: invisible characters are removed, raw or as entities, by whole classes rather than a list: every `\p{Default_Ignorable_Code_Point}` (soft hyphen, zero-width chars, variation selectors, Hangul fillers U+115F/U+1160/U+3164/U+FFA0, tag characters U+E0000–U+E007F…), every format character `\p{Cf}` and the specials U+FFF0–U+FFFB (so `TO`+U+E0020+`DO`, `TO`+U+FFF9+`DO` and `TO`+U+3164+`DO` read `TODO`), plus any such character NFKC produces. Visible text is untouched: Portuguese in NFC or NFD and emoji sequences (ZWJ, flags, keycaps) give no false positives; every non-ASCII character goes through NFKC (fullwidth `｛｛…｝｝` reads `{{…}}`) and then loses its combining marks (`T̶ODO`, `TO\u0301DO` read `TODO`); Cyrillic and Greek letters drawn like Latin ones are folded (`TОDO` with a Cyrillic О reads `TODO`); MDX string expressions are unwrapped (`{"{"}{"{"}x{"}"}{"}"}` reads `{{x}}`); and, in a second view of MDX bodies, emphasis delimiters and inline tags are dropped outside code (`Lo*rem* ipsum`, `TO<span></span>DO`), and in a third view inline elements are dropped together with their content, since CSS can hide that content (`{<span hidden>x</span>{ fill me }}` renders as `{{ fill me }}`). That third view replaces each element with a space, unwraps nesting to any depth (it fails the file past 200 levels instead of letting it through) and runs only the `{{…}}` rule, so `TO<span>x</span>DO`, `Lorem <em>dolor</em> ipsum` or `TB<sup>2</sup>D` don't become false positives. Hits found in the second or third view say so in the report ("… (read without inline markup)", "… (read without inline elements)"), because that exact text isn't in the file.

Placeholder markers always fail, with no exception (spec §8.1): every literal `{{…}}`, in any case, with any spacing, of any length, with inner braces, **inside code too** (an Angular `{{ user.name }}` example has to be described in words instead; entities and fullwidth braces are decoded, so they are caught too), plus `[TODO…]` and `TODO:` (any case). **This goes beyond §8.1**, which only names `{{…}}` pairs: a `{{` that is never closed fails too, and so does math or set notation that opens with two braces (`{{1, 2}, {3}}`, and `{ {` with one space between the braces; describe it in words instead). A single brace followed later by `}}`, as in `{a, {b}}`, passes. The detector is linear: 100k `{{` take ~30 ms, ~100 ms through the whole normalise-and-scan path. Bidirectional controls (U+202A–U+202E, U+2066–U+2069) fail outright wherever they appear, because an RLO can make reversed text display as "TODO"; the report quotes the code point and the text after it. The invisible directional marks LRM, RLM and ALM (U+200E, U+200F, U+061C), common in text pasted from Word or chat apps, fail with "invisible character U+200E, delete it". Every other invisible character is simply removed before matching (above), so it can't hide a marker and doesn't fail on its own.

Two kinds of `{{` are syntax, not placeholders, and are exempt **in the source scan only**: the outer braces of a JSX expression prop inside an MDX tag (`<span style={{ fontWeight: 700 }}>`, outside code and comments) and Mermaid shape delimiters in `.mmd` files (`H{{"Log trade"}}`, a hexagon node; the label inside is still scanned). Any other `{{` in MDX or Mermaid still fails, and so does a `{{` that renders: the rendered-output check below has no such exemption, so a prop or shape that ends up as visible `{{` in the HTML, a served SVG or an OG image fails the strict build. Braces around CSS-hidden content (`{<span style={{display:"none"}}>x</span>{ fill me }}`) still fail: the prop braces are blanked, but the third view still reads the outer `{{ fill me }}`.

For bare `TODO`, `TBD`, `FIXME` and `lorem ipsum` there is one exception:

- **`placeholder-ok` opt-out.** Write `placeholder-ok` inside a comment: `{/* placeholder-ok */}` in MDX, `# placeholder-ok` in frontmatter, `// placeholder-ok` in `.ts`, `%% placeholder-ok` in Mermaid. A comment that shares its line with content exempts that line. A comment alone on its line exempts the next key in frontmatter, `.ts` and Mermaid (its first line plus deeper-indented continuation lines). In an MDX body it exempts the next paragraph, up to the next blank line, or the whole fenced code block below it. Comments never render, so readers don't see the marker. `pnpm content:check` lists every exemption with `file:line` and its reason.

`pnpm build:production` then runs `scripts/check-output.ts` on what the build emitted (every prerendered HTML page, RSC payload, sitemap and robots) and on every SVG it serves (`public/**/*.svg`: diagrams and covers; text, joined per `<text>` element, and every attribute value, comments skipped), then `pnpm covers --check`, `pnpm avatar --check` and `pnpm diagrams --check`. OG images are PNGs, so their text is checked before they are drawn: `ogImageResponse` (`lib/og.tsx`, `lib/og-guard.ts`) walks the element tree passed to `ImageResponse`, expanding components, and under `CONTENT_STRICT` throws "Rendered output check failed: … OG image text …" on any marker, which fails the prerender and the build. That second check also catches a placeholder that only appears at render time, for example one assembled in a JSX expression. It uses the same markers, normalization and case rules and judges each match on its own, like the source scan, so the two agree. In HTML it removes the empty `<!-- -->` React puts between adjacent strings, and also scans a text-only view (inline tags removed, block tags as spaces), so `{<em>{</em>x}}` reads `{{x}}`. It parses the RSC payload (inline in the HTML and in `.rsc` files) as JSON and joins strings when they are adjacent siblings in a `children` array or sit inside inline elements, which is what renders as one text. A non-placeholder match passes only when the source scan exempted that exact text with `placeholder-ok`, on a route that renders its file (a case-study body exempts only its own page; frontmatter and global files exempt every page). A `{{…}}` never passes.

## Case-study labels

`site.ui.problemLabel`, `site.ui.solutionLabel` and `site.ui.impactLabel` are required, non-empty strings. They label the problem → solution → impact block of private/nda case studies, all in the same style. That block is rendered once: right after the diagram when the body has exactly one `<Diagram />`, otherwise right after the header.

## Environment

See `.env.example`.

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL. Falls back to `https://$VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3000` (`lib/site-url.ts`). Leave it unset for now: the site uses its `*.vercel.app` production URL, which Vercel provides through `VERCEL_PROJECT_PRODUCTION_URL`. Set it when a custom domain exists. |
| `SHOW_DRAFTS=true` | Preview mode: drafts are rendered, linked and marked with a badge. Ignored when `VERCEL_ENV=production`. |
| `CONTENT_STRICT=true` | Production guard: launch issues become build errors. Can't be combined with `SHOW_DRAFTS`. |
| `VERCEL_ENV=production` | Enables indexing and Vercel Analytics (pageviews only). Every other environment is `noindex`, and its build aliases `@vercel/analytics/next` to a no-op (`next.config.ts`), so no analytics code ships. |

These flags are read **at build time only**. `next.config.ts` inlines them (`lib/build-env.ts`), and the draft pages and OG images a build didn't prerender are 404s (`dynamicParams = false`). Setting `SHOW_DRAFTS` or `VERCEL_ENV` on `next start` or in a runtime function can't reveal drafts in a production build.

## Build modes

```bash
pnpm build             # default: errors fail, launch issues are warnings
pnpm build:preview     # SHOW_DRAFTS=true
pnpm build:production  # CONTENT_STRICT=true, then the rendered-output/SVG check and covers/avatar/diagrams --check; for the production deployment
pnpm build:vercel      # what Vercel runs: build:production when VERCEL_ENV=production, build otherwise
pnpm start             # serve the last build
```

`vercel.json` sets `buildCommand` to `pnpm build:vercel` (`scripts/build-vercel.mjs`), so production deployments always get the strict build and previews get the normal one. To render drafts on previews, set `SHOW_DRAFTS=true` in the Vercel Preview environment.

Case-study OG images are at `/projects/<slug>/opengraph-image` (the meta tags add a `?<hash>` cache-buster, like the one Next adds to the root OG image, computed from what the card draws plus `OG_TEMPLATE_VERSION` in `lib/og-size.ts`: bump it when the card design changes), prerendered for published projects only (the build output lists them as `●` SSG). `opengraph-image.tsx` uses static exports and `dynamicParams = false`, so a draft or unknown slug is a 404 that renders nothing and writes nothing to the cache (an e2e production test counts the files under `.next` before and after requesting unknown slugs). The per-project alt text ("<title>: case study by …", `site.ui.ogProjectAlt`) is set in the page's `generateMetadata` as `openGraph.images` and `twitter.images` (`url`, `alt`, `width`, `height`), which take precedence over the file's own metadata.

## Diagrams

`content/diagrams/*.mmd` are rendered to `assets/rendered/diagrams/*.svg` with Mermaid CLI. Each SVG stores the source hash, and the build fails if a diagram is stale (`pnpm diagrams --check` checks it without Chrome; the strict build runs it). The check compares hashes only: it doesn't re-render the `.mmd` to prove the SVG body matches, so a hand-edited body with the hash comment kept is caught only if it adds a placeholder marker (output scan) or changes a cover made from it (`covers --check`).

Rendered diagrams and covers are committed under `assets/rendered/`, not `public/`. `pnpm assets` (`scripts/publish-assets.ts`, run first by `dev`, `dev:preview` and every `build*` script) empties `public/diagrams/` and `public/covers/` (gitignored) and copies in the files of the projects the build shows: published projects only, plus drafts when `SHOW_DRAFTS=true`. If one of those files is missing, the script fails with the project slug and the expected path instead of shipping a broken image. A production build therefore returns 404 for a draft's cover or diagram (an e2e production test checks it). Run builds through the pnpm scripts, not a bare `next build`. Both folders are served with `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'`.

```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome pnpm diagrams   # path to any local Chrome
```

## Avatar

The About section shows the profile photo at 224 px (grayscale via CSS) from WebPs next to the source: `filipe-bravo-224.webp` (1x) and `filipe-bravo-640.webp` (2x/3x screens), as a `srcSet`. Regenerate them after changing the photo. `pnpm avatar` records the photo's SHA-256 in `assets/avatar-thumb.json`. The build fails if the thumbnail is missing, and `pnpm avatar --check`, `pnpm content:check` and `pnpm test` fail if it was made from a different photo.

```bash
pnpm avatar           # regenerate
pnpm avatar --check   # verify only
```

## Project covers

Cards and case-study pages show a 1200×750 (16:10) cover per project, mapped by slug in `lib/project-covers.ts`. `pnpm covers` composes each one from committed sources onto the site background: an official logo in `assets/project-logos/` (SVG stays SVG; a raster logo is written as WebP), the project's rendered diagram, or both (email-scraper shows the TakeFreeTours logo beside its own diagram; takefreetours shows the logo alone on the page colour, so the two cards differ). SVG sources go through `sanitizeSvg` (`lib/project-covers-compose.ts`) first. It parses them with a namespace-aware XML parser (`@xmldom/xmldom`) and checks every node against an allowlist keyed by namespace URI and local name, so prefixes (`<s:script>`, `<h:script>` with the XHTML namespace, `<s:foreignObject>`) can't hide anything. Elements: only SVG-namespace `svg g defs style path rect circle polygon text tspan clipPath linearGradient stop marker filter feDropShadow` (what our logos and Mermaid diagrams use). Attributes: a fixed list of presentation/geometry attributes plus `data-*`/`aria-*`; `xmlns` declarations only for the SVG and XLink namespaces; no other namespaced attribute; no `on*`; `href`/`xlink:href` only as `#fragment` (no `data:` or any URL). CSS (`<style>` text and `style` attributes; Mermaid needs `<style>`, so it is allowed but restricted) may not contain backslash escapes (`@\69mport`, `\75rl(`), comments, any at-rule but `@keyframes`, `url()` other than `url(#id)`, `expression`, `-moz-binding`, `behavior` or `javascript:`. DOCTYPE internal subsets, processing instructions and parse errors are rejected too. Anything not allowed throws and fails the run; nothing is stripped silently except comments and the prologue. The output is the re-serialized tree. It writes `assets/rendered/covers/<slug>.{svg,webp}` and records the hashes of every source and of each output in `assets/project-covers.json`. `pnpm covers --check`, `pnpm content:check` and `pnpm test` fail when a source changed after its cover was made, when a cover file was edited or overwritten, or (SVG) when it differs from a fresh in-memory render, so re-run `pnpm covers` after `pnpm diagrams`. An SVG source's hash is taken after sanitizing, so a re-rendered diagram whose drawing didn't change (only its `src-sha256` comment) doesn't make its cover stale. Sources, origin URLs and licences are listed in [`ASSETS.md`](ASSETS.md).

```bash
pnpm covers           # regenerate
pnpm covers --check   # verify only
```

## Design

The visual direction is "Dark + Brutal" (`portfolio-design/visual-direction.md`). Tokens (colours, type scale, spacing, motion, hard shadows, zero radius) live in the `@theme` and `:root` blocks of `styles/globals.css`; repeated patterns are `@utility` classes there (`ui-container`, `ui-btn*`, `ui-link`, `ui-card`, `ui-ruled`, `marquee`, `site-meta`…). Body and UI use system fonts. The only web font is Anton 400 (`assets/fonts/`, SIL OFL, subset to ASCII + `§ · —`, 10.7 KB), loaded with `next/font/local` without preload and used only by the marquee section headings, never in `section#top` (an e2e test checks this). The headings switch to Anton only after the `load` event (an inline script adds `html.fonts-ready`; until then, without JS and during Anton's swap period, they use "Anton Fallback Narrow" / "Anton Fallback": / "Anton Fallback Roboto": `@font-face` rules over local Arial Narrow and Arial, or their metric clones (Liberation Sans [Narrow], Nimbus Sans Narrow, Arimo), and Roboto for Android, with `size-adjust` 83.2% / 67.5% / 73.8% and ascent/descent overrides so the uppercase titles are as wide as in Anton, within a few percent per title. An unadjusted fallback was ~48% wider and the swap caused CLS 0.05 on `/#projects`; an e2e test keeps `/#projects`, `/#experience` and `/#skills` under 0.01, forces each of the three faces in turn on `/#projects`, and has a control proving an unmatched fallback is detected. Not covered: a real Android device (whether Chrome there resolves `local("Roboto")`, and its Roboto build; the face was tuned on Roboto Regular from Google Fonts), Impact, and Firefox/Safari, which have no Layout Instability API), so the font is requested after the LCP paint: when it finished before the paint, Lighthouse put it in the LCP chain (home LCP ~2.5 s in 2 of 5 runs instead of ~1.9 s). The footer shows the build commit (`VERCEL_GIT_COMMIT_SHA`, "local" elsewhere), the build date (`BUILD_DATE`, defaulting to the build day, UTC) and a copyright year taken from that date, all inlined at build time. **On Vercel, Project Settings → Environment Variables → "Automatically expose System Environment Variables" must stay enabled**; without it `VERCEL_GIT_COMMIT_SHA` is not set during the build and the footer shows "local".

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test                                  # Vitest unit tests
pnpm exec playwright install               # once
pnpm e2e                                   # both suites below, one after the other
pnpm e2e:preview                           # Playwright + axe, 5 browsers; preview build on :3200
pnpm e2e:production                        # Chromium; production build on :3201: drafts are 404 and never linked
pnpm build && pnpm start -p 3100           # then, in another terminal:
BASE_URL=http://localhost:3100 CHROME_PATH=/usr/bin/google-chrome pnpm lighthouse   # RUNS=5 by default
```

### Performance budgets

Lighthouse, mobile preset, per page (PM sign-off, FIL-8):

| Metric | Budget |
| --- | --- |
| Performance | ≥ 95 |
| Accessibility, Best Practices, SEO | 100 |
| LCP | ≤ 2000 ms |
| CLS | < 0.05 |
| TBT | < 150 ms |
| JavaScript, Brotli | ≤ 150 KB on `/`, ≤ 125 KB on a case study |
| Non-root JavaScript on `/`, Brotli | ≤ 35 KB |

`scripts/lighthouse.mjs` gates on Brotli sizes computed locally (quality 11) from the scripts Lighthouse saw loaded. That is a proxy for what Vercel serves. Gzip sizes are printed for information only. "Root" means Next's `rootMainFiles` (React, the Next runtime and Turbopack); every other script counts as "non-root". Each page runs `RUNS` times (default 5) and every run is printed, with the LCP of each run. **Every budget, LCP ≤ 2000 ms included, must hold on every one of the 5 runs**; one failing run fails the script (PM decision, QA FIL-8 r2; there is no median rule). Two changes keep LCP on `/` stable under Lantern (simulated throttling), which counts every request that finished before the observed paint in the LCP chain: the Anton font is only requested after the `load` event (see Design), and the CSS is inlined in the HTML (`experimental.inlineCss` in `next.config.ts`), so there is no render-blocking stylesheet request. Measured on this machine (RUNS=5): worst run 2530 → 1773 ms.

`inlineCss` trade-off: the CSS ends up in the HTML three times (the `<style>` tag plus twice in the inline RSC payload), about 7 KB Brotli per page, and it is no longer cached across navigations. Confirm the effect on a Vercel preview (real CDN compression and HTTP/2) before relying on these numbers, and revisit the flag if the CSS grows past ~50 KB raw.

**The official measurement happens on the Vercel preview during the deploy phase.** Local runs use simulated throttling, and LCP on `/` varies from run to run.

Locally, Lighthouse differs from a Vercel deployment in three known ways:
- Outside `VERCEL_ENV=production`, pages are `noindex` on purpose. The script ignores that one SEO audit unless `EXPECT_INDEXABLE=true`, which you should set when running against production.
- `next start` serves gzip and Vercel serves Brotli. The home HTML is about 17.5 KB gzip against about 12.3 KB Brotli, so locally it takes one extra simulated round trip.
- With `VERCEL_ENV=production`, Best Practices is lowered by the `/_vercel/insights` script, which only exists on Vercel.

## Deferred (not in v1)

- Vercel Speed Insights and custom `track()` events (spec §7.5). PM decision, answering spec §7.5 / Q9: v1 ships only Vercel Analytics pageviews, in production.
- Sticky architecture diagram with step highlighting on case studies (spec §4.2).
- AI demo section (`features.demoSection` is `false`).
- Custom domain: the site runs on `*.vercel.app` until one is chosen.
- Content-Security-Policy header (deferred per spec). The other security headers are set in `next.config.ts`.

## Dependency audit

`pnpm audit` exits 0. It lists one high advisory as ignored, dev-only: `braces` ≤ 3.0.3 (GHSA-vfj7-8cjw-p6xm, stack exhaustion on deeply nested patterns), via `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch`. No patched release exists (3.0.3 is the latest; the advisory lists no fixed version), so a pnpm override has nothing to point to. The advisory is ignored by id in `package.json` (`pnpm.auditConfig.ignoreGhsas`), not by severity, so any other advisory still fails. `braces` runs only inside ESLint on our own glob patterns, never in the build output or at runtime. Remove the ignore and add an override once a fix ships.

`pnpm audit:prod` (`scripts/audit-prod.mjs`) proves the ignore hides nothing that ships: it runs `pnpm audit --prod` on a temp copy of `package.json` **without** `auditConfig` (next to the real lockfile) and exits 1 on any production advisory, ignored or not (`node scripts/audit-prod.mjs --all` audits dev dependencies the same way and does report `braces`). It needs the registry, so it isn't part of the Vercel build; CI should run both `pnpm audit` and `pnpm audit:prod` on every push (there is no CI workflow in the repo yet). A unit test checks that the script strips the ignore and audits `--prod`.

## Known log noise

`next start` logs `Error: Internal: NoFallbackError` for each 404 under `/projects/*` (unknown slugs, and drafts in production). It comes from Next itself: `dynamicParams = false` makes Next throw that internal error to fall through to the 404 page, and a minimal app with one `[slug]` page and `dynamicParams = false` logs the same line on Next 16.3.7. The response is a correct 404; nothing in this repo causes or can silence it.
