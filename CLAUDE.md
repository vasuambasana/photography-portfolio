# Photography Portfolio — working notes

Static photography portfolio for Vasu Ambasana. Astro 4 SSG, Tailwind, one React
island (the lightbox), deployed to Cloudflare Pages at https://vasuambasana.com.

## Branches

`main` is the deployed branch. **Never merge `dev` into `main` directly** — changes
get validated on `dev` first, and promotion to `main` is the owner's call.

## Before committing

```bash
npm run validate   # content checks (orphan images, bad refs, alt text, pin collisions)
npm run check      # astro check / TypeScript
npm run build      # the real test — image processing is where things break
```

CI runs all three on PRs to `main`/`dev`. The build is slow (several minutes) because
Astro generates ~520 responsive image variants from 127 source photos.

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
| `npm run exif audit` / `exif fix` | Report / backfill missing camera metadata |
| `npm run slugs check` / `slugs fix` | Report / repair slugs that drifted from titles |
| `npm run validate` | Content integrity checks |

`slugs fix` rewrites live URLs. Run `check` first.

## Gotchas

- Machine-specific paths belong in `.env`, never in a script.
- `scripts/archive/` holds one-off asset generators (logo, favicon). Not part of any workflow.
- The contact form is `mailto:`-only. There is no backend.
