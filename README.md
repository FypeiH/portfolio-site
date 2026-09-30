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

Placeholders use the `{{TODO: ...}}` form. They are allowed in drafts but never rendered. The strict guard scans only published projects, their diagrams and the global content files. It ignores drafts and files whose names start with `_`.

## Environment

See `.env.example`.

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL. Falls back to `https://$VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3000` (`lib/site-url.ts`). Leave it unset for now: the site uses its `*.vercel.app` production URL, which Vercel provides through `VERCEL_PROJECT_PRODUCTION_URL`. Set it when a custom domain exists. |
| `SHOW_DRAFTS=true` | Preview mode: drafts are rendered, linked and marked with a badge. |
| `CONTENT_STRICT=true` | Production guard: launch issues become build errors. Can't be combined with `SHOW_DRAFTS`. |
| `VERCEL_ENV=production` | Enables indexing and Vercel Analytics. Every other environment is `noindex`, and its build aliases `@vercel/analytics/next` to a no-op (`next.config.ts`), so no analytics code ships. |

## Build modes

```bash
pnpm build             # default: errors fail, launch issues are warnings
pnpm build:preview     # SHOW_DRAFTS=true
pnpm build:production  # CONTENT_STRICT=true, use this for the production deployment
pnpm start             # serve the last build
```

## Diagrams

`content/diagrams/*.mmd` are rendered to `public/diagrams/*.svg` with Mermaid CLI. Each SVG stores the source hash, and the build fails if a diagram is stale.

```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome pnpm diagrams   # path to any local Chrome
```

## Avatar

The hero shows the profile photo at 112 px from a 224 px WebP next to the source (`filipe-bravo-224.webp`). Regenerate it after changing the photo; the build fails if it is missing.

```bash
pnpm avatar
```

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
BASE_URL=http://localhost:3100 CHROME_PATH=/usr/bin/google-chrome RUNS=3 pnpm lighthouse
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
| First-party JavaScript on `/`, Brotli | ≤ 35 KB |

`scripts/lighthouse.mjs` gates on Brotli sizes computed locally (quality 11) from the scripts Lighthouse saw loaded. That is a proxy for what Vercel serves. Gzip sizes are printed for information only. "Framework" means Next's `rootMainFiles` (React, the Next runtime and Turbopack); every other script counts as first-party.

**The official measurement happens on the Vercel preview during the deploy phase.** Local runs use simulated throttling, and LCP on `/` varies from run to run.

Locally, Lighthouse differs from a Vercel deployment in two known ways:
- Outside `VERCEL_ENV=production`, pages are `noindex` on purpose. The script ignores that one SEO audit unless `EXPECT_INDEXABLE=true`, which you should set when running against production.
- With `VERCEL_ENV=production`, Best Practices is lowered by the `/_vercel/insights` script, which only exists on Vercel.

## Deferred (not in v1)

- Sticky architecture diagram with step highlighting on case studies (spec §4.2).
- AI demo section (`features.demoSection` is `false`).
- Custom domain: the site runs on `*.vercel.app` until one is chosen.
- Content-Security-Policy header (deferred per spec). The other security headers are set in `next.config.ts`.
