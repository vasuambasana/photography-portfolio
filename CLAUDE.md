# Photography Portfolio — working notes

Static photography portfolio for Vasu Ambasana. Astro 4 SSG, Tailwind, one React
island (the lightbox), deployed to Cloudflare Pages at https://vasuambasana.com.

## Branches

`main` is the deployed branch. **Never merge `dev` into `main` directly** — changes
get validated on `dev` first, and promotion to `main` is the owner's call.

## Content safety (non-negotiable)

Never invent awards, clients, testimonials, credentials, exhibitions, publications, prices,
or locations. Camera settings come from EXIF or nowhere — a guessed aperture is a lie about
a real photograph. If a fact is needed and unknown, write `[PLACEHOLDER: ...]` and flag it.

Alt text is editorial copy, never a filename and never the category with an article in
front. Never crop or distort a photograph — native aspect ratio always.

Fuller rules in [`src/CLAUDE.md`](src/CLAUDE.md), which loads automatically when you
work anywhere under `src/`.

## Before committing

```bash
npm run validate   # content checks (orphan images, bad refs, alt text, pin collisions)
npm run test       # vitest — pure logic in src/utils (fast, <1s)
npm run check      # astro check / TypeScript
npm run build      # the real test — image processing is where things break
```

CI runs all four on PRs to `main`/`dev`. The build takes several minutes because Astro
generates ~500 responsive image variants from 127 source photos.

No new dependency without justifying it — `sharp` and `tailwindcss` are the only runtime
ones that aren't Astro itself.

## Content model

Two collections, both markdown, defined in `src/content/config.ts`.

**`photos`** — one file per photograph in `src/content/photos/<slug>.md`. The filename
is the slug and therefore the URL (`/photo/<slug>`).

- `image` is an Astro asset reference, relative to the markdown file:
  `../../assets/photos/<category>/<file>.jpg`. Images live in **`src/assets/photos/`**,
  not `public/` — that's what lets Astro emit WebP + `srcset` + intrinsic dimensions.
- `order` is an **optional pin**, not a sort key. Photos with `order` sort first
  (ascending); everything else is newest-first by `date`. Don't add `order` to a photo
  unless you specifically want it pinned to the top — a value on every photo is what
  made the old global sort meaningless.

**`journal`** — long-form entries in `src/content/journal/<slug>.md`.

- `coverImage` and `relatedPhotos` are `reference('photos')`, so they hold **photo slugs**,
  not paths. A typo fails the build instead of silently rendering nothing.
- Reading time is computed from the body at build time. There is no `readingTime` field.
- Cover alt text comes from the referenced photo — there is no `coverAlt` field.

## Conventions worth knowing

- **No View Transitions.** `astro:page-load` never fires. Inline `<script>` tags in
  `.astro` files are deferred modules, so the DOM is ready when they run — just write
  top-level code. Don't add `astro:page-load` listeners.
- **Gallery filter state lives in `?filter=`** and nothing else. All four consumers
  (gallery grid, photo prev/next, filmstrip, lightbox) go through `src/utils/filter.ts`.
  If you're about to read `searchParams.get('filter')` by hand, import the helper instead —
  divergent defaults here caused three separate bug-fix commits.
- **Photo sorting goes through `sortPhotos()`** in `src/utils/photos.ts`. Don't re-sort inline.
- `src/pages/photo/[slug].astro` builds its filmstrip/lightbox payload **once** in
  `getStaticPaths`, shared across all 127 pages. Keep it that way — moving `getImage()`
  calls inside the per-page map multiplies build time by 127.

## Ingest pipeline

`npm run add-photo` reads originals from `PHOTO_SOURCE_DIR` (see `.env.example`),
deduplicates, extracts EXIF, calls Gemini for title/alt/description, writes the web
JPEG into `src/assets/photos/<category>/` and the markdown into `src/content/photos/`.

| Command | What it does |
| --- | --- |
| `npm run add-photo [path]` | Ingest new photos (defaults to `PHOTO_SOURCE_DIR`) |
| `npm run backfill-ai` | Regenerate placeholder alt text / descriptions (`--dry-run`, `--limit N`) |
| `npm run locate list` | Shoots by capture date, with location status |
| `npm run locate set "<place>" --dates <d>` | Assign a location to a whole shoot |
| `npm run locate gps` | Backfill location from EXIF GPS (currently 0 photos have any) |
| `npm run exif audit` / `exif fix` | Report / backfill missing camera metadata |
| `npm run slugs check` / `slugs fix` | Report / repair slugs that drifted from titles |
| `npm run optimize` | Shrink oversized source JPEGs |
| `npm run validate` | Content integrity checks |

Ingest needs `GEMINI_API_KEY` in `.env`. Without it, `add-photo` writes placeholder copy
rather than failing — which is how 92 of 127 photos ended up with `alt: "A <category>
photograph"`. `npm run validate` reports the current count.

`slugs fix` rewrites live URLs. Run `check` first.

## Design

Tokens are CSS custom properties in `src/styles/global.css`, surfaced as Tailwind tokens.
**Never hardcode a hex or a raw Tailwind colour** — `bg-zinc-50` doesn't theme,
`bg-surface-main` does.

**Light is the default theme**, `.dark` is the variant. `prompts/initial_prompt.md` says
dark-first; that document is historical and out of date. Don't "fix" it.

Load the `design-system` skill before any UI work.

## Tooling in this repo

| Path | What it does |
| --- | --- |
| `.claude/skills/design-system/` | Tokens, type scale, layout and motion rules |
| `.claude/commands/` | `/add-photo`, `/new-journal`, `/revamp`, `/audit` |
| `.claude/agents/voice-check.md` | Read-only copy audit for AI tells and invented facts |
| `.claude/hooks/no-fat-images.sh` | Blocks committing photos over 800KB |
| `.claude/hooks/typecheck-changed.sh` | Validates content on edit; type-checks code (throttled) |
| `.mcp.json` | Playwright MCP, for screenshotting real pages |

## Gotchas

- Machine-specific paths belong in `.env`, never in a script.
- `scripts/archive/` holds one-off asset generators (logo, favicon). Not part of any workflow.
- The contact form is `mailto:`-only. There is no backend.
- `prompts/initial_prompt.md` and `User/Guide.md` are historical records of how the project
  was built. They describe things that no longer exist. Don't treat them as specifications.
