# Filipe Bravo's Portfolio

**My personal website: who I am, what I've done, and the projects I've built, told as short case studies.**

---

## What is it?

This is the source code of my portfolio website. A visitor can read:

- **About me**: a short profile and photo
- **Experience** and **Skills**
- **Projects**: each one is a small case study that explains the *problem*, the *solution* and the *impact*, often with an architecture diagram

The look is called **"Dark + Brutal"**: dark background, bold type, hard shadows, no rounded corners.

---

## How is it built? (short version)

| Piece | Technology |
|---|---|
| The website | Next.js 16 and React 19 |
| Styling | Tailwind CSS 4 |
| Case studies | MDX (Markdown with the option to add components) |
| Content safety | zod (checks that all content has the right shape) |
| Diagrams | Mermaid, turned into images ahead of time |
| Hosting | Vercel |

---

## Run it on your computer

You need **Node 22 or newer** and **pnpm 10**.

```bash
pnpm install        # download the dependencies (once)
pnpm dev            # open http://localhost:3000, shows published projects only
pnpm dev:preview    # same, but also shows draft projects
```

---

## Where do I change the text?

Everything a visitor reads lives in the **`content/`** folder, so you never need to touch the code to update the site:

| File or folder | What it holds |
|---|---|
| `site.ts` | Site-wide texts (title, labels, menu...) |
| `profile.ts` | The "About me" section |
| `experience.ts` | Work and study history |
| `skills.ts` | Skills list |
| `projects/*.mdx` | One file per project case study |
| `diagrams/*.mmd` | The diagram source for each project |

To check that everything is correct without building the whole site:

```bash
pnpm content:check
```

---

## Drafts and published projects

Each project is either a **draft** or **published**.

- **Published** projects appear on the live site.
- **Drafts** are hidden from visitors. You only see them in preview mode (`pnpm dev:preview`), where they get a "draft" badge.

While writing, you can leave reminders like `{{TODO: add numbers}}` inside a **draft**. They are allowed there, and they are never shown to visitors.

### The "no unfinished text" guard

Before the real website goes live, an automatic guard makes sure no unfinished text slips through. It looks for things like:

- `{{ ... }}` markers
- `TODO`, `TBD`, `FIXME`
- `lorem ipsum`

If it finds any in a **published** page, the production build **fails on purpose**, so nothing half-written can be published by accident.

Some details worth knowing:

- It is smart about it. It sees through tricks like invisible characters, look-alike letters or text split across lines. A sentence like "I built a Todo app" is fine.
- It also checks the finished pages, the generated images for social sharing, and the diagrams, not just the source files.
- If you really need one of these words in published text, write a comment saying `placeholder-ok` next to it. Comments are never shown to visitors, and `pnpm content:check` lists every exemption.

---

## The settings (environment variables)

| Setting | What it does |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | The site's main address. Leave it empty for now: the site uses its free `*.vercel.app` address. Set it when a custom domain exists. |
| `SHOW_DRAFTS=true` | Preview mode: draft projects are shown. Ignored on the real production site. |
| `CONTENT_STRICT=true` | Strict mode: unfinished-content problems stop the build. Can't be combined with `SHOW_DRAFTS`. |
| `VERCEL_ENV=production` | Marks the real live site. Only then are search engines allowed to index it and visitor counting (page views only) turned on. |

> ⚠️ These settings are read **only while building**. Changing them afterwards on a running site does nothing, so drafts can never leak out of a production build.

See `.env.example` for a ready-made template.

---

## Building the site

| Command | What it's for |
|---|---|
| `pnpm build` | Normal build. Real errors stop it; unfinished-content issues are only warnings. |
| `pnpm build:preview` | Same, but with drafts shown. |
| `pnpm build:production` | **Strict build** for the live site. Also checks the built pages, images, diagrams, covers and avatar. |
| `pnpm build:vercel` | What Vercel runs: strict when it's the live site, normal for previews. |
| `pnpm start` | Serve the last build. |

You don't need to choose on Vercel: `vercel.json` already runs `pnpm build:vercel`. So **the live site always gets the strict build and previews get the normal one.**

> Always build using these `pnpm` commands, never a bare `next build`.

To show drafts on Vercel previews, set `SHOW_DRAFTS=true` in the Vercel *Preview* environment.

---

## Images that are generated for you

Some images are created by small tools and **saved in the repository**, so the build never has to guess.

### Diagrams

Each project can have a diagram written as text in `content/diagrams/*.mmd`. A tool turns it into an image (SVG).

```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome pnpm diagrams   # needs a local Chrome
pnpm diagrams --check                                            # only verify, no Chrome needed
```

Each image remembers a fingerprint of its source. **If you change a diagram and forget to regenerate it, the build fails.**

### Project covers

Every project card has a 1200×750 cover picture, built from the project's logo, its diagram, or both.

```bash
pnpm covers            # regenerate
pnpm covers --check    # only verify
```

Run `pnpm covers` after `pnpm diagrams`. The logos used and their licences are listed in `ASSETS.md`. Logo files are cleaned by a strict filter that only lets safe SVG parts through; anything suspicious stops the run.

### Profile photo

The "About" photo is shown from two optimised copies. After changing the photo, regenerate them:

```bash
pnpm avatar            # regenerate
pnpm avatar --check    # only verify
```

---

## Checking quality

```bash
pnpm lint                 # code style
pnpm typecheck            # type errors
pnpm test                 # unit tests
pnpm exec playwright install   # once, to download test browsers
pnpm e2e                  # full browser tests (preview + production builds)
```

The e2e tests also check **accessibility** and that **drafts are really hidden** in a production build.

### Speed targets (Lighthouse, mobile)

| What | Goal |
|---|---|
| Performance score | 95 or more |
| Accessibility, Best Practices, SEO | 100 |
| Time until the main content appears (LCP) | 2 seconds or less |
| Layout jumping while loading (CLS) | under 0.05 |
| JavaScript size on the home page | 150 KB or less (compressed) |

**Every goal must hold on all 5 test runs**, not just on average. The official measurement is done on the Vercel preview, because local results vary a bit.

Run it yourself:

```bash
pnpm build && pnpm start -p 3100
# in another terminal:
BASE_URL=http://localhost:3100 CHROME_PATH=/usr/bin/google-chrome pnpm lighthouse
```

---

## A few design details

- Colours, sizes and spacing are defined in one place: `styles/globals.css`.
- The text uses the visitor's system fonts, apart from one web font, **Anton**, used only for the big section headings. It loads after the page has finished loading, and a similar-looking fallback font is used until then, so the page doesn't jump around when the font arrives.
- The footer shows the **build version and date**. On Vercel, keep *"Automatically expose System Environment Variables"* turned **on**, otherwise the version shows as "local".

---

## What's not done yet

- Detailed visitor tracking (only simple page views for now)
- A sticky architecture diagram with step highlighting on case studies
- An AI demo section (switched off)
- A custom domain (the site runs on `*.vercel.app` for now)
- A Content-Security-Policy header (the other security headers are already set)

---

## Good to know

- **Security audit:** `pnpm audit` passes. One known warning, about a library used only by the code checker (ESLint), is ignored on purpose because no fixed version exists. It never reaches the live site. `pnpm audit:prod` proves nothing risky ships to production.
- **A harmless message in the logs:** `next start` may print `NoFallbackError` when someone visits a project page that doesn't exist (or a draft in production). That is just how Next.js reports a normal "404 not found". The visitor gets a correct 404 page.

---

## In one sentence

> **A fast, accessible, dark-and-bold portfolio where all the text lives in simple files, and automatic guards make sure nothing unfinished ever reaches the live site.**