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

Two kinds of `{{` are syntax, not placeholders, and are exempt **in the source scan only**: the outer braces of a JSX expression prop inside an MDX tag (`<span style={{ fontWeight: 700 }}>`, outside code and comments) and Mermaid hexagon delimiters in `.mmd` files (`H{{"Log trade"}}`: a node id starting a token in graph syntax, directly followed by `{{`; the label inside is still scanned). A `{{` inside a quoted label, an `|edge label|`, a shape's text (`B[a{{x}}]`) or old-style edge text (`A-- a{{x}} -->B`) is never exempt. Any other `{{` in MDX or Mermaid still fails, and so does a `{{` that renders: the rendered-output check below has no such exemption, so a prop or shape that ends up as visible `{{` in the HTML, a served SVG or an OG image fails the strict build. Braces around CSS-hidden content (`{<span style={{display:"none"}}>x</span>{ fill me }}`) still fail: the prop braces are blanked, but the third view still reads the outer `{{ fill me }}`.

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

Case-study OG images are at `/projects/<slug>/opengraph-image` (the meta tags add a `?<hash>` cache-buster, like the one Next adds to the root OG image, computed from what the card draws plus `OG_TEMPLATE_VERSION` in `lib/og-size.ts`: bump it when the card design changes), prerendered for published projects only (the build output lists them as `●` SSG). `opengraph-image.tsx` uses static exports and `dynamicParams = false`, so a draft or unknown slug is a 404 that renders nothing and writes nothing to the cache (an e2e production test counts the files under `.next` before and after requesting unknown slugs). The per-project alt text ("<title> — case study by …", `site.ui.ogProjectAlt`; no colon, since a title can have one) is set in the page's `generateMetadata` as `openGraph.images` and `twitter.images` (`url`, `alt`, `width`, `height`), which take precedence over the file's own metadata.

## Diagrams

`content/diagrams/*.mmd` are rendered to `assets/rendered/diagrams/*.svg` with Mermaid CLI. Each SVG stores the source hash, and the build fails if a diagram is stale (`pnpm diagrams --check` checks it without Chrome; the strict build runs it). `pnpm diagrams` also records the SHA-256 of each source and each written SVG in `assets/diagrams.json` (`lib/diagrams-manifest.ts`), so `--check`, `pnpm content:check` and `pnpm test` fail on a hand-edited SVG, and every SVG in `assets/rendered/diagrams/` (drafts' and orphans' too) must pass `sanitizeSvg` in `--check` and in `pnpm assets`, which refuses to publish anything otherwise.

Rendered diagrams and covers are committed under `assets/rendered/`, not `public/`. `pnpm assets` (`scripts/publish-assets.ts`, run first by `dev`, `dev:preview` and every `build*` script) empties `public/diagrams/` and `public/covers/` (gitignored) and copies in the files of the projects the build shows: published projects only, plus drafts when `SHOW_DRAFTS=true`. If one of those files is missing, the script fails with the project slug and the expected path instead of shipping a broken image. A production build therefore returns 404 for a draft's cover or diagram (an e2e production test checks it). Run builds through the pnpm scripts, not a bare `next build`. Both folders are served with `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'`.

Diagrams render at 18 px (`themeVariables.fontSize` in `scripts/render-diagrams.ts`). On a case study, `<Diagram />` (`components/mdx/Diagram.tsx`) breaks out of the text column up to 1100 px, never shrinks below its intrinsic width × 14/18 on screens ≥ 48rem (so labels stay at ≥ 14 px; a wider diagram scrolls sideways inside a focusable region instead), and adds two caption actions: "View full size" opens a native `<dialog>` with the SVG at 1:1 (Esc or the close button closes it and focus returns to the button; `components/mdx/DiagramZoom.tsx`) and a link opens the raw SVG in a new tab. Tall top-down (`TD`) and very wide left-right (`LR`) graphs read worst; pick the direction that keeps the drawing near the column's aspect ratio.

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

Cards and case-study pages show a 1200×750 (16:10) cover per project, mapped by slug in `lib/project-covers.ts`. `pnpm covers` composes each one from committed sources onto the site background: an official logo in `assets/project-logos/` (SVG stays SVG; a raster logo is written as WebP), the project's rendered diagram, or both (email-scraper shows the TakeFreeTours logo beside its own diagram; takefreetours shows the logo alone on the page colour, so the two cards differ). SVG sources go through `sanitizeSvg` (`lib/project-covers-compose.ts`) first. It parses them with a namespace-aware XML parser (`@xmldom/xmldom`) and checks every node against an allowlist keyed by namespace URI and local name, so prefixes (`<s:script>`, `<h:script>` with the XHTML namespace, `<s:foreignObject>`) can't hide anything. Elements: only SVG-namespace `svg g defs style path rect circle polygon text tspan clipPath linearGradient stop marker filter feDropShadow` (what our logos and Mermaid diagrams use). Attributes: a fixed list of presentation/geometry attributes plus `data-*`/`aria-*`; `xmlns` declarations only for the SVG and XLink namespaces; no other namespaced attribute; no `on*`; `href`/`xlink:href` only as `#fragment` (no `data:` or any URL). CSS (`<style>` text and `style` attributes; Mermaid needs `<style>`, so it is allowed but restricted) may only call an allowlist of functions (`rgb rgba hsl hsla url drop-shadow` and the 2D transforms; `url()` only as `url(#id)`, so `image-set()`, `-webkit-image-set()`, `src()`, `attr()`… fail), may not contain a string with `:` or `/`, and may not contain backslash escapes (`@\69mport`, `\75rl(`), comments, any at-rule but `@keyframes`, `expression`, `-moz-binding`, `behavior` or `javascript:`. `href` values are checked untrimmed (`" #a"` fails), nesting deeper than 64 elements fails, and the output is serialised with `requireWellFormed`. DOCTYPE internal subsets, processing instructions and parse errors are rejected too. Anything not allowed throws and fails the run; nothing is stripped silently except comments and the prologue. The output is the re-serialized tree. It writes `assets/rendered/covers/<slug>.{svg,webp}` and records the hashes of every source and of each output in `assets/project-covers.json`. `pnpm covers --check`, `pnpm content:check` and `pnpm test` fail when a source changed after its cover was made, when a cover file was edited or overwritten, or (SVG) when it differs from a fresh in-memory render, so re-run `pnpm covers` after `pnpm diagrams`. An SVG source's hash is taken after sanitizing, so a re-rendered diagram whose drawing didn't change (only its `src-sha256` comment) doesn't make its cover stale. Sources, origin URLs and licences are listed in [`ASSETS.md`](ASSETS.md).

```bash
pnpm covers           # regenerate
pnpm covers --check   # verify only
```

## Design

The visual direction is "Dark + Brutal" (`portfolio-design/visual-direction.md`). Tokens (colours, type scale, spacing, motion, hard shadows, zero radius) live in the `@theme` and `:root` blocks of `styles/globals.css`; repeated patterns are `@utility` classes there (`ui-container`, `ui-btn*`, `ui-link`, `ui-card`, `ui-ruled`, `marquee`, `site-meta`…). Body and UI use system fonts. Labels use the generic `monospace, monospace` stack (the doubled name avoids the browser shrinking a lone `monospace`); only Apple systems get `ui-monospace, Menlo` (an `html.apple` class set by the inline script, plus an `@supports (font: -apple-system-body)` rule for Safari without JS), because asking for names a system doesn't have made font matching ~70% of the home page's first layout and pushed Lighthouse TBT over budget (QA FIL-8). For the same reason the decorative arrows (↗ ↑) are drawn in that mono face (`ui-arrow`): the sans system font often lacks them, and the fallback search doubled the first layout. The only web font is Anton 400 (`assets/fonts/`, SIL OFL, subset to ASCII + `§ · —`, 10.7 KB), loaded with `next/font/local` without preload and used only by the marquee section headings and the hero name. Both switch to Anton only after the `load` event (an inline script adds `html.fonts-ready`; until then, without JS and during Anton's swap period, they use "Anton Fallback Narrow" / "Anton Fallback": / "Anton Fallback Roboto": `@font-face` rules over local Arial Narrow and Arial, or their metric clones (Liberation Sans [Narrow], Nimbus Sans Narrow, Arimo), and Roboto for Android, with `size-adjust` 83.2% / 67.5% / 73.8% and ascent/descent overrides so the uppercase titles are as wide as in Anton, within a few percent per title. An unadjusted fallback was ~48% wider and the swap caused CLS 0.05 on `/#projects`; an e2e test keeps `/`, `/#projects`, `/#experience` and `/#skills` under 0.01, forces each of the three faces in turn on `/` and `/#projects`, and has a control proving an unmatched fallback is detected. Not covered: a real Android device (whether Chrome there resolves `local("Roboto")`, and its Roboto build; the face was tuned on Roboto Regular from Google Fonts), Impact, and Firefox/Safari, which have no Layout Instability API), so the font is requested after the LCP paint: when it finished before the paint, Lighthouse put it in the LCP chain (home LCP ~2.5 s in 2 of 5 runs instead of ~1.9 s). The hero (`components/sections/HeroSection.tsx`) is text first: the name as the h1 and the largest text (Anton at `min(19cqi, 8.5rem)` of its column, one line from 320 px up and with 200% text zoom (no rem minimum, which outgrew the column when zoomed), in the fallback face until load, so the hero paints with the HTML and never waits for the font; e2e tests check one line and no overflow at 320–390 px in both faces and at 320 px with 200% text zoom, and that the font is requested after `load`), the role in two short lines, one support line, the availability badge (`components/ui/AvailabilityBadge.tsx`, `profile.availability`, spec §1.1) and two CTAs (email first, projects second), and, from the lg breakpoint only, Filipe's photo in a duotone treatment over the decorative grid (`HeroPhoto.tsx`, `HeroGrid.tsx`; made by `scripts/hero-photo.ts` from a source kept outside the repo, see `ASSETS.md`). It is a `<picture>` whose sources match only wide screens and whose `<img>` falls back to an inline 1×1 GIF, so phones never request it and it can't be their LCP; on desktop it has fixed 288×360 dimensions and `fetchpriority="high"`. Role, social links and CV live in About and Contact. Section headings are a continuous marquee (`ui/Section.tsx`, `styles/motion.css`): two identical groups translated by −50% in a 40 s linear loop, paused on hover; only the first title is real text (the copies are CSS-painted `::after` or in an `aria-hidden` group), and with `prefers-reduced-motion: reduce` it is a static band. For WCAG 2.2.2 (pause, stop, hide) the footer has a "Pause animations" toggle button (`components/motion/MotionToggle.tsx`, `aria-pressed`, label `site.ui.motionPause`; rendered only with JS). It sets `html.motion-paused`, which pauses every marquee, and saves the choice in `localStorage` (`lib/motion-preference.ts`); the inline script in `components/layout/SiteDocument.tsx` re-applies it before first paint, so a returning visitor never sees a moving frame and nothing shifts (the site sends no page CSP, so the inline script is allowed; revisit when a CSP is added). The header's home link starts with the FB monogram (Anton outlines as inline SVG, also the favicon set; see `ASSETS.md`), then the name; with large text (a header narrower than 15rem, a container query) only the monogram stays, and the link keeps its accessible name. With 200% text zoom at 320 px the page has no horizontal scroll: grids use `minmax(0, 1fr)` tracks, long words break (`overflow-wrap: break-word`), and an e2e test checks `/` and a case study for page width, the name not overlapping the Menu button and a tap at the Menu's centre reaching it. The Experience timeline shows a 128 px company tile below the dates, at every width (sized so Gigantic's small "DIGITAL GROWTH" reads at DPR 1; e2e tests check 320 and 390 px for overflow): the official logo in monochrome when one is committed (`lib/company-logos.ts`, files from `pnpm logos`, sources in `ASSETS.md`; Gigantic in its yellow colours on the same dark tile), otherwise the company's initials. The footer shows the build commit (`VERCEL_GIT_COMMIT_SHA`, "local" elsewhere), the build date (`BUILD_DATE`, defaulting to the build day, UTC) and a copyright year taken from that date, all inlined at build time. **On Vercel, Project Settings → Environment Variables → "Automatically expose System Environment Variables" must stay enabled**; without it `VERCEL_GIT_COMMIT_SHA` is not set during the build and the footer shows "local".

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test                                  # Vitest unit tests
pnpm exec playwright install               # once
pnpm e2e                                   # both suites below, one after the other
pnpm e2e:preview                           # Playwright + axe, 5 browsers; preview build on :3200
pnpm e2e:production                        # Chromium; production build on :3201: drafts are 404 and never linked
E2E_PORT=3300 E2E_PRODUCTION_PORT=3301 pnpm e2e   # other ports: outside CI a server already on the port is reused as is
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
| HTML document as `next start` serves it (gzip, headers included) | ≤ 40 KB |

The HTML budget is enforced twice, from one number (`lib/html-budget.json`): `pnpm build:production` fails when any prerendered page in `.next/server/app` is over 40 KB gzip (`scripts/check-output.ts`, `lib/html-budget.ts`; it lists every page's size), and `scripts/lighthouse.mjs` fails a run whose report has no Document request instead of counting it as 0 KB.

`scripts/lighthouse.mjs` gates on Brotli sizes computed locally (quality 11) from the scripts Lighthouse saw loaded. That is a proxy for what Vercel serves. Gzip sizes are printed for information only. "Root" means Next's `rootMainFiles` (React, the Next runtime and Turbopack); every other script counts as "non-root". Each page runs `RUNS` times (default 5) and every run is printed, with the LCP of each run. **Every budget, LCP ≤ 2000 ms included, must hold on every one of the 5 runs**; one failing run fails the script (PM decision, QA FIL-8 r2; there is no median rule). Two changes keep LCP on `/` stable under Lantern (simulated throttling), which counts every request that finished before the observed paint in the LCP chain: the Anton font is only requested after the `load` event (see Design), and the CSS is inlined in the HTML (`experimental.inlineCss` in `next.config.ts`), so there is no render-blocking stylesheet request. Measured on this machine (RUNS=5): worst run 2530 → 1773 ms.

`inlineCss` trade-off: the CSS ends up in the HTML twice (the `<style>` tag plus once in the inline RSC payload), about 7 KB Brotli per copy, and it is no longer cached across navigations. Next adds a third copy for `global-error` when the root layout sits directly under `app/` (vercel/next.js#98110), so the root layout is `app/(site)/layout.tsx` and unmatched URLs get `app/global-not-found.tsx` (`experimental.globalNotFound`); both render `components/layout/SiteDocument.tsx`. Inside the group Next serves the home OG image at `/opengraph-image-<hash>` (the meta tag has it); the case-study OG route stays outside the group, at `/projects/<slug>/opengraph-image`. An e2e production test counts the CSS copies. The old home OG URL, `/opengraph-image`, is now a 404 (crawlers re-read `og:image` from the page, so only a hard-coded link to it would break). **When vercel/next.js#98110 is fixed** (fix PR #98136), revert the route group: move `app/(site)/*` back to `app/`, drop `app/global-not-found.tsx` and `experimental.globalNotFound`, and check that the e2e production test still counts two CSS copies.

Why the HTML size budget: in Lantern, the LCP of these text-only first screens is the end of the document download plus the framework chunks that finished before the paint (an `EvaluateScript` under 10 ms is too short for Lantern to prove it ran after the paint, so the chunk stays in the chain). The chunks start when the document ends, and the simulated TCP window (14.6 KB, doubling each 150 ms round trip) carries ~43.8 KB in two round trips: with the third CSS copy the home HTML was 44.3 KB and every run paid one more round trip (5 runs each, same machine: `/` 1852–1966 → 1742–1809 ms; `/projects/contacts-report`, already under the edge, 1704–1892 → 1701–1736 ms). What is left: half of Lantern's estimate also counts the lazy card covers that load before the paint (home ~1.81 s instead of ~1.66 s), and a run where React's own chunk evaluates in under 10 ms puts it in the chain too. Confirm the effect on a Vercel preview (real CDN compression and HTTP/2) before relying on these numbers, and revisit the flag if the CSS grows past ~50 KB raw.

**The official measurement happens on the Vercel preview during the deploy phase.** Local runs use simulated throttling, and LCP on `/` varies from run to run.

Locally, Lighthouse differs from a Vercel deployment in three known ways:
- Outside `VERCEL_ENV=production`, pages are `noindex` on purpose. The script ignores that one SEO audit unless `EXPECT_INDEXABLE=true`, which you should set when running against production.
- `next start` serves gzip over HTTP/1.1 and Vercel serves Brotli over HTTP/2, so locally the HTML is larger and each parallel chunk opens its own simulated connection.
- With `VERCEL_ENV=production`, Best Practices is lowered by the `/_vercel/insights` script, which only exists on Vercel.

## Deferred (not in v1)

- Vercel Speed Insights and custom `track()` events (spec §7.5). PM decision, answering spec §7.5 / Q9: v1 ships only Vercel Analytics pageviews, in production.
- Sticky architecture diagram with step highlighting on case studies (spec §4.2).
- AI demo section (`features.demoSection` is `false`).
- Custom domain: the site runs on `*.vercel.app` until one is chosen.
- Content-Security-Policy header (deferred per spec). The other security headers are set in `next.config.ts`.

## Dependency audit

`pnpm audit` exits 0. It lists one high advisory as ignored, dev-only: `braces` ≤ 3.0.3 (GHSA-vfj7-8cjw-p6xm, stack exhaustion on deeply nested patterns), via `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch`. No patched release exists (3.0.3 is the latest; the advisory lists no fixed version), so a pnpm override has nothing to point to. The advisory is ignored by id in `package.json` (`pnpm.auditConfig.ignoreGhsas`), not by severity, so any other advisory still fails. `braces` runs only inside ESLint on our own glob patterns, never in the build output or at runtime. Remove the ignore and add an override once a fix ships.

`pnpm.overrides` force patched versions of transitive dev dependencies, each bounded to the current major (or minor, for 0.x) so a future breaking release isn't pulled in silently:

| Override | Advisory | Pulled in by |
| --- | --- | --- |
| `lodash-es` `>=4.18.0 <5.0.0` | GHSA-r5fr-rjxr-66jc (high, `_.template` code injection), GHSA-f23m-r3pf-42rh (prototype pollution in `_.unset`/`_.omit`) | Mermaid CLI |
| `source-map-js` `>=1.2.2 <2.0.0` | GHSA-68fv-2mgg-jv7q (high, event-loop DoS via indexed source-map section offsets) | PostCSS (Vite/Vitest, Tailwind) |
| `katex` `>=0.18.2 <0.20.0` | GHSA-238p-pmpm-9mq7 (low, prototype pollution bypassing trust restrictions) | Mermaid CLI |

Drop an override once every dependent ships the fixed version on its own.

`pnpm audit:prod` (`scripts/audit-prod.mjs`) proves the ignore hides nothing that ships: it runs `pnpm audit --prod` on a temp copy of `package.json` **without** `auditConfig` (next to the real lockfile) and exits 1 on any production advisory, ignored or not (`node scripts/audit-prod.mjs --all` audits dev dependencies the same way and does report `braces`). It needs the registry, so it isn't part of the Vercel build; CI should run both `pnpm audit` and `pnpm audit:prod` on every push (there is no CI workflow in the repo yet). A unit test checks that the script strips the ignore and audits `--prod`.

## Known log noise

`next start` logs `Error: Internal: NoFallbackError` for each 404 under `/projects/*` (unknown slugs, and drafts in production). It comes from Next itself: `dynamicParams = false` makes Next throw that internal error to fall through to the 404 page, and a minimal app with one `[slug]` page and `dynamicParams = false` logs the same line on Next 16.3.7. The response is a correct 404; nothing in this repo causes or can silence it.
