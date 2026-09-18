# Content model

Everything on the site comes from two Astro content collections, both plain markdown,
both schema-validated in [`src/content/config.ts`](../src/content/config.ts). There is no
CMS and no database. Adding content means adding a markdown file.

## `photos`

One file per photograph: `src/content/photos/<slug>.md`. **The filename is the slug and
therefore the public URL** (`/photo/<slug>`), so renaming a file changes a live URL.

```yaml
---
title: "Winter on the Headland"
category: "nature"
image: ../../assets/photos/nature/winter-on-the-headland.jpg
alt: "Golden sunset light illuminates a rugged, icy rocky shoreline..."
date: 2024-02-18
location: "New England Coast"
originalFilename: "20240218_165223.jpg"
featured: false
cameraSpecs:
  body: "samsung Galaxy S24 Ultra"
  focalLength: "23mm (35mm eq)"
  aperture: "f/1.7"
  shutterSpeed: "1/180s"
  iso: "50"
---

The photographer's note about this frame, in first person.
```

| Field | Notes |
| --- | --- |
| `title` | Also the hover label and lightbox caption. |
| `category` | One of `architecture`, `nature`, `street`, `night`, `people`, `portrait`, `travel`, `abstract`. Drives the gallery filter. |
| `image` | **Relative path** into `src/assets/photos/`. Not a `/public` URL (see below). |
| `alt` | Required, and must describe the image. `validate` rejects filenames masquerading as alt text. |
| `date` | The capture date. This is the canonical sort key. |
| `location` | Optional; shown as a pill on the photo page and on hover. |
| `originalFilename` | Links the web JPEG back to the original, so `exif fix` can find it. |
| `featured` | Puts the photo in the home page grid. |
| `order` | **Optional pin**: see below. |
| `cameraSpecs` | All sub-fields optional; the specs plaque hides whatever's absent. |

### Why `image` is a relative path

Photos live in `src/assets/photos/<category>/`, not `public/photos/`. Anything under
`src/assets` goes through Astro's image pipeline at build time, which gives responsive
`srcset`, WebP output, and intrinsic `width`/`height` on every `<img>`. Files in `public/`
are copied verbatim and get none of that, which is why the masonry grid used to reflow
as images loaded.

The path is relative to the markdown file, so from `src/content/photos/x.md` it is
always `../../assets/photos/<category>/<file>`.

### `order` is a pin, not a sort key

The default ordering is **newest first by `date`**. `order` exists only to force specific
photos to the front: any photo that has an `order` sorts ahead of all the ones that don't,
ascending.

Leave it off unless you mean it. Previously every photo carried an `order` assigned
per-category but sorted globally, which meant the "All" view interleaved categories by a
number that had no cross-category meaning, with ties broken by filesystem order.
`npm run validate` now fails on two photos in the same category sharing a pin.

All sorting goes through `sortPhotos()` in [`src/utils/photos.ts`](../src/utils/photos.ts).

## `journal`

Long-form entries: `src/content/journal/<slug>.md` → `/journal/<slug>`.

```yaml
---
title: "Twenty Minutes on the Headland"
subtitle: "Why I keep driving out to the New England coast in February."
type: field-notes
date: 2024-02-18T16:52:00.000Z
coverImage: winter-on-the-headland
location: "New England Coast"
tags: [winter, coast, cold-light, new-england]
excerpt: "It was 19 degrees with a stiff wind off the bay..."
featured: true
relatedPhotos: [winter-on-the-headland, winter-stroll-by-the-shore]
---
```

| Field | Notes |
| --- | --- |
| `type` | `field-notes`, `location-guide`, `essay`, `behind-the-lens`. Labels live in `JOURNAL_TYPE_LABELS`. |
| `coverImage` | A **photo slug**, not a path. Resolved via `reference('photos')`. |
| `relatedPhotos` | Photo slugs. A bad slug fails the build. |
| `tags` | Each tag gets a page at `/journal/tag/<slug>`. |
| `excerpt` | Used on cards, meta description, and the RSS feed. |

### Derived, not stored

- **Reading time** is computed from the body at build time (`readingTime()` in
  `src/utils/journal.ts`). There is no `readingTime` field; a hand-entered one goes stale.
- **Cover alt text** comes from the referenced photo's `alt`. There is no `coverAlt` field.

### Drafts

`draft: true` keeps an entry in the repo but out of production. It still renders under
`astro dev`, so you can work on it and look at it; `publishedJournal()` strips drafts when
`import.meta.env.PROD` is set, across the index, tag pages, detail pages, the RSS feed and
the home page.

`npm run validate` **fails** if a published (non-draft) entry still contains
`[PLACEHOLDER`. That's the whole point of the flag: scaffolding should never ship.

### Related photos should be from the same shoot

`relatedPhotos` is a claim that these frames belong together. Check the capture dates before
filling it in. The first version of the Death Valley entry linked two photos from 2023 and
two from 2026 while describing a single morning.

### References fail loudly

`coverImage` and `relatedPhotos` use Astro's `reference('photos')`. Previously
`relatedPhotos` was a plain string array resolved with `.map(find).filter(Boolean)`, so a
typo silently dropped the photo. Now the build fails with the offending slug named.

## Validation

`npm run validate` covers what Zod can't:

- every `image` resolves to a file on disk
- no orphaned images in `src/assets/photos/` (warning)
- alt text present, and not just a filename
- duplicate titles (warning)
- `order` collisions inside a category (error)
- journal `coverImage` / `relatedPhotos` resolve to real photo slugs
- two tags that would collide on the same `/journal/tag/` URL (warning)

Warnings don't fail; errors exit non-zero so CI gates on them.
