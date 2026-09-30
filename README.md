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
| `NEXT_PUBLIC_SITE_URL` | Canonical URL. Falls back to `https://$VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3000` (`lib/site-url.ts`). |
| `SHOW_DRAFTS=true` | Preview mode: drafts are rendered, linked and marked with a badge. |
| `CONTENT_STRICT=true` | Production guard: launch issues become build errors. Can't be combined with `SHOW_DRAFTS`. |
| `VERCEL_ENV=production` | Enables indexing and Vercel Analytics. Every other environment is `noindex`. |

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

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test                                  # Vitest unit tests
pnpm exec playwright install               # once
pnpm e2e                                   # Playwright + axe; builds preview and serves it on :3200
BASE_URL=http://localhost:3100 CHROME_PATH=/usr/bin/google-chrome pnpm lighthouse   # against a running `pnpm start -p 3100`
```

Locally, Lighthouse shows two known differences from a Vercel deployment. Outside `VERCEL_ENV=production`, SEO is lowered by the intentional `noindex`. With it set, Best Practices is lowered by the `/_vercel/insights` script, which only exists on Vercel.
