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

Case rules: bare `TODO` counts only in uppercase, so "built a Todo app" is fine. `todo:` and `[todo…]` count in any case, and so do `TBD`, `FIXME` and `lorem ipsum`. Zero-width characters (U+200B–U+200D, U+2060, U+FEFF) are removed before scanning, and so are MDX string expressions: `{"{"}{"{"}x{"}"}{"}"}` reads as `{{x}}`.

Placeholder markers always fail, with no exception: `[TODO…]`, `TODO:` (any case) and a placeholder-style `{{…}}`, meaning its inner text contains a marker or `todo` in any case (`{{TODO: …}}`, `{{ tbd }}`, `{{ todo }}`) or is an all-caps slot (`{{PROJECT_NAME}}`). For the other markers, two exceptions keep legitimate text from failing the build:

- **`{{ … }}` inside code.** Inside an inline code span or a fenced code block of an MDX body, a `{{ … }}` that isn't placeholder-style is allowed, for example an Angular `{{ user.name }}`. A backtick escaped with `\` or written inside a `{…}` JSX expression doesn't start a code span. Outside code, `{{ … }}` always counts.
- **`placeholder-ok` opt-out** (bare `TODO`, `TBD`, `FIXME`, `lorem ipsum`, and `{{ … }}` that isn't placeholder-style). Write `placeholder-ok` inside a comment: `{/* placeholder-ok */}` in MDX, `# placeholder-ok` in frontmatter, `// placeholder-ok` in `.ts`, `%% placeholder-ok` in Mermaid. A comment that shares its line with content exempts that line. A comment alone on its line exempts the next key in frontmatter, `.ts` and Mermaid (its first line plus deeper-indented continuation lines). In an MDX body it exempts the next paragraph, up to the next blank line, or the whole fenced code block below it. Comments never render, so readers don't see the marker. `pnpm content:check` lists every exemption with `file:line` and its reason.

`pnpm build:production` then runs `scripts/check-output.ts` on what the build emitted (every prerendered HTML page, RSC payload, sitemap and robots). That second check also catches a placeholder that only appears at render time, for example one assembled in a JSX expression. It uses the same markers and case rules and judges each match on its own, like the source scan, so the two agree. In HTML it removes the empty `<!-- -->` React puts between adjacent strings. It parses the RSC payload (inline in the HTML and in `.rsc` files) as JSON and joins strings only when they are adjacent siblings in a `children` array, which is what renders as one text. A match passes only when the source scan exempted that exact text, on a route that renders its file (a case-study body exempts only its own page; frontmatter and global files exempt every page), and, for the code rule, when it renders inside `<code>`.

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
pnpm build:production  # CONTENT_STRICT=true, then the rendered-output check; for the production deployment
pnpm build:vercel      # what Vercel runs: build:production when VERCEL_ENV=production, build otherwise
pnpm start             # serve the last build
```

`vercel.json` sets `buildCommand` to `pnpm build:vercel` (`scripts/build-vercel.mjs`), so production deployments always get the strict build and previews get the normal one. To render drafts on previews, set `SHOW_DRAFTS=true` in the Vercel Preview environment.

Case-study OG images are at `/projects/<slug>/opengraph-image`, prerendered for published projects only.

## Diagrams

`content/diagrams/*.mmd` are rendered to `public/diagrams/*.svg` with Mermaid CLI. Each SVG stores the source hash, and the build fails if a diagram is stale.

```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome pnpm diagrams   # path to any local Chrome
```

## Avatar

The About section shows the profile photo at 224 px (grayscale via CSS) from a 224 px WebP next to the source (`filipe-bravo-224.webp`). Regenerate it after changing the photo. `pnpm avatar` records the photo's SHA-256 in `assets/avatar-thumb.json`. The build fails if the thumbnail is missing, and `pnpm avatar --check`, `pnpm content:check` and `pnpm test` fail if it was made from a different photo.

```bash
pnpm avatar           # regenerate
pnpm avatar --check   # verify only
```

## Project covers

Cards and case-study pages show a 1200×750 (16:10) cover per project, mapped by slug in `lib/project-covers.ts`. `pnpm covers` composes each one from a committed source onto the site background: an official logo in `assets/project-logos/` (SVG stays SVG; a raster logo is written as WebP) or the project's rendered diagram. It writes `public/covers/<slug>.{svg,webp}` and records the source hashes in `assets/project-covers.json`. `pnpm covers --check`, `pnpm content:check` and `pnpm test` fail when a source changed after its cover was made, so re-run `pnpm covers` after `pnpm diagrams`. Sources, origin URLs and licences are listed in [`ASSETS.md`](ASSETS.md).

```bash
pnpm covers           # regenerate
pnpm covers --check   # verify only
```

## Design

The visual direction is "Dark + Brutal" (`portfolio-design/visual-direction.md`). Tokens (colours, type scale, spacing, motion, hard shadows, zero radius) live in the `@theme` and `:root` blocks of `styles/globals.css`; repeated patterns are `@utility` classes there (`ui-container`, `ui-btn*`, `ui-link`, `ui-card`, `ui-ruled`, `marquee`, `site-meta`…). Body and UI use system fonts. The only web font is Anton 400 (`assets/fonts/`, SIL OFL, subset to ASCII + `§ · —`, 10.7 KB), loaded with `next/font/local` without preload and used only by the marquee section headings, never in `section#top` (an e2e test checks this). The footer shows the build commit (`VERCEL_GIT_COMMIT_SHA`, "local" elsewhere) and the build date (`BUILD_DATE`, defaulting to the build day), both inlined at build time.

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

`scripts/lighthouse.mjs` gates on Brotli sizes computed locally (quality 11) from the scripts Lighthouse saw loaded. That is a proxy for what Vercel serves. Gzip sizes are printed for information only. "Root" means Next's `rootMainFiles` (React, the Next runtime and Turbopack); every other script counts as "non-root". Each page runs `RUNS` times (default 5). Every run is printed, and the budgets are checked on the run with the median LCP, because LCP under simulated throttling is bimodal on `/`. In some runs Lantern counts the script downloads in the LCP chain, which gives about 2.5 s instead of about 1.96 s.

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
