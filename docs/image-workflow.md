# Image workflow

From a RAW file on disk to a responsive `<picture>` on the site.

## Where images live

| Location | Contents | Processed? |
| --- | --- | --- |
| `PHOTO_SOURCE_DIR` (outside the repo) | Originals — RAW + JPEG, untouched | No, never committed |
| `src/assets/photos/<category>/` | Web-sized JPEG, one per published photo | **Yes** — Astro builds variants |
| `public/` | Favicons, logo, profile photo, robots.txt | No, copied verbatim |

RAW files are gitignored (`*.CR3`, `*.ARW`, `*.NEF`, …) and must never be committed.

## Ingest: `npm run add-photo`

```bash
npm run add-photo                                  # everything under PHOTO_SOURCE_DIR
npm run add-photo -- "D:\photos\architecture" --category architecture
npm run add-photo -- "D:\photos\one.jpg" --category people --featured
npm run add-photo -- --skip-ai                     # placeholder text, no Gemini calls
```

With no path it reads `PHOTO_SOURCE_DIR` from `.env` and auto-detects categories from
subfolder names.

For each file it:

1. **Deduplicates**, three ways — MD5 of the first 1 MB, an EXIF fingerprint
   (timestamp + camera + exposure settings), and RAW/JPEG stem pairing. When the same
   frame appears as both JPEG and RAW, the RAW wins.
2. **Extracts EXIF** via `exifr`, falling back to carving the embedded JPEG out of CR3
   files when `exifr` can't read them. Normalises `"Apple Apple iPhone"`-style duplication,
   cleans verbose smartphone lens names, prefers 35 mm-equivalent focal lengths on phones.
3. **Calls Gemini** with the image for a title, alt text and a first-person description.
   Tries `GEMINI_MODEL`, then `GEMINI_FALLBACK_MODEL`; on quota exhaustion it writes
   placeholders rather than failing the run.
4. **Resizes** to max 2560 px wide, mozjpeg q85, and writes to
   `src/assets/photos/<category>/<slug>.jpg`.
5. **Writes** `src/content/photos/<slug>.md` with the frontmatter and description.

Already-imported photos are skipped (matched on slug or `originalFilename`), so re-running
over the whole source folder is safe and picks up only what's new.

Between photos it waits ~4 s to stay inside the Gemini free-tier rate limit.

## Build-time processing

Because photos live in `src/assets`, Astro's `<Image>` component handles the rest:

- **WebP** output
- **`srcset`** at the widths each component asks for
- **intrinsic `width`/`height`** on every `<img>`, so nothing reflows as images load

Widths by context:

| Context | Widths | Why |
| --- | --- | --- |
| Gallery / featured / related cards | 400, 800 | Grid thumbnails |
| Home hero, journal hero | 800, 1600, 2400 | Full-bleed, LCP element |
| Photo page display + lightbox | 1800 | Single large render |
| Filmstrip thumbnails | 200 | Small, many per page |

This produces roughly 520 variants from 127 source photos, and it is the slow part of the
build (several minutes). Two rules keep it from getting worse:

- **Don't add AVIF.** It roughly triples encode time for a modest size win at this volume.
- **Don't call `getImage()` inside a per-page loop.** `src/pages/photo/[slug].astro`
  builds the shared filmstrip/lightbox payload once inside `getStaticPaths`. Moving those
  calls into the per-page map would multiply the work by 127.

## Maintenance

```bash
npm run exif audit     # which photos have incomplete cameraSpecs
npm run exif fix       # re-read EXIF from originals and merge it in
npm run slugs check    # slugs that have drifted from their titles
npm run slugs fix      # rename markdown + image, rewrite frontmatter
npm run validate       # integrity check across all content
```

`exif fix` needs `PHOTO_SOURCE_DIR`, because the web JPEGs have had most of their metadata
stripped by sharp.

`slugs fix` **changes live URLs**. Run `check` first, and remember that journal entries
reference photos by slug — run `validate` afterwards to catch anything left dangling.

## Repository size

`src/assets/photos/` is ~129 MB across 127 files, and git history holds every prior
version of each one (`.git` is ~137 MB). A git *move* is cheap — blobs are content-addressed,
so relocating files doesn't duplicate storage — but re-running an optimiser over every photo
and committing the result does.

If this becomes a problem, the option is to keep originals in R2 or similar and commit only
web derivatives. That's a deliberate decision, not something to do by accident.
