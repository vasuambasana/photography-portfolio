# Content rules

Applies to everything under `src/content/`.

Schema lives in `content/config.ts`. Full reference: [`docs/content-model.md`](../docs/content-model.md).

## Never invent facts

No awards, clients, testimonials, credentials, exhibitions, publications, prices, gallery
representation, or named locations. If something is needed and unknown, write
`[PLACEHOLDER: ...]` and say so. Never fill the gap with something plausible.

Camera settings come from EXIF or nowhere. An empty `cameraSpecs` field is correct; a
guessed aperture is a lie about a real photograph.

`location` is filled from EXIF GPS or from what the photographer said. Otherwise leave it
empty. "Looks like New England" is not a source.

**None of the originals carry GPS** (checked: 0 of 129), so location cannot be derived from
a file. Assign it per shoot with `npm run locate set "<place>" --dates <date>`, and only
for shoots you actually know. A photo that says "Southwest Badlands" when it was Death
Valley is the failure mode this exists to prevent. That one shipped.

## Alt text is editorial copy

Describe what is visible, for someone who cannot see it. Specific and concrete.

`alt: "A street photograph"` is the ingest fallback, the category with an article in front.
It is not alt text. 92 of 127 photos currently carry this; `npm run validate` reports the
count and `npm run backfill-ai` regenerates them.

Alt text must not simply repeat the title.

## Voice

First person, understated, concrete. What actually happened: the temperature, the time, what
nearly went wrong. Specific beats lyrical, and plain is fine.

Avoid: "a testament to", "invites the viewer", "serves as a reminder", "captures the
essence", three-adjective stacks, and sentences that only restate what's in the frame.

## photos/

- Filename is the slug **and the live URL** (`/photo/<slug>`). Renaming breaks links.
  Use `npm run slugs check` before `npm run slugs fix`.
- `image` is a path relative to the markdown file: `../../assets/photos/<category>/<file>.jpg`.
  Photos live in `src/assets/`, **not** `public/`. That's what gives them responsive WebP
  and intrinsic dimensions.
- `date` is the capture date and the canonical sort key (newest first).
- `order` is an **optional pin**, not a sort key. Add it only to force a photo to the top.
  Two photos with the same `order` in the same category is a validation error.

## journal/

- `coverImage` and `relatedPhotos` are `reference('photos')`. They hold **photo slugs**,
  not paths. A slug that doesn't exist fails the build.
- There is no `readingTime` field, it's computed from the body.
- There is no `coverAlt` field. It comes from the cover photo's `alt`.
- `draft: true` keeps an entry out of production builds while still rendering in
  `astro dev`. Use it for anything with `[PLACEHOLDER]` still in it. `npm run validate`
  fails on a published entry that contains one.
- `relatedPhotos` should come from the same shoot. Check the capture dates: an entry about
  one morning that links photos from two different years is wrong, and that also shipped.
- Every tag generates a page at `/journal/tag/<slug>`. Reuse existing tags; a near-duplicate
  splits one tag page into two.

## After editing

`npm run validate`.
