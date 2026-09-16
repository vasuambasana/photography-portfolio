# Photography Portfolio Project Changelog & Learning Log

This log tracks all architectural, specification, and prompt changes made throughout the development of the photography portfolio project, along with mistakes identified and lessons learned.

---

## [0.5.1] - 2026-09-15

Corrections and follow-ups from the first review of the revamped `dev` branch.

### Fixed
- **A journal entry claimed the wrong place.** "Finding Scale in the Badlands", located
  "Southwest Badlands", was shot in **Death Valley**. Renamed to
  `finding-scale-in-death-valley`, location and tags corrected, and the 10-photo
  2023-04-21..23 shoot labelled `Death Valley National Park, California`. Two photo titles
  carrying "Badlands" were retitled. The entry's `relatedPhotos` had also mixed two photos
  from 2023 with two from 2026 while describing a single morning; now all five are from the
  same shoot.
- **RSS looked broken.** The feed was always valid and returned 200 — browsers just stopped
  rendering RSS, so clicking it showed raw XML. Added an XSL stylesheet
  (`public/rss/styles.xsl`) so it renders as a readable page, plus
  `<link rel="alternate">` autodiscovery, which was missing entirely.

### Added
- **`npm run locate`** — `list` shows shoots by capture date with location status, `set`
  assigns a location to a whole shoot by date range or slug, `gps` backfills from EXIF.
- **GPS → place name in `add-photo`**, via Nominatim. Coordinates are never written to the
  site; only a coarse place name, and sharp strips metadata from the published JPEG.
- **`draft: true` on journal entries.** Renders in `astro dev`, stripped from production
  across index, tag pages, detail pages, RSS and the home page. `validate` now *fails* on a
  published entry still containing `[PLACEHOLDER`.
- Three draft journal entries scaffolded from verified EXIF — real dates, gear, lenses and
  exposure ranges — with every narrative claim left as an explicit placeholder.

### Changed
- **Journal tags filter in place** instead of navigating away. With 3 entries and 14 tags
  every tag page held exactly one story, which is a dead end. Tag pages still exist as
  shareable permalinks, linked from inside each entry. `getActiveFilter`/`withFilter` take a
  param name so the gallery (`?filter=`) and journal (`?tag=`) share one implementation.

### Lessons Learned & Mistakes Avoided
- **An empty field is an invitation to invent one.** All 127 photos had `location: ""`, so
  the ingest model filled the gap from the pixels and produced "Badlands" for Death Valley.
  *Lesson:* a generative pipeline will not leave a blank alone. Either supply the fact or
  make its absence explicit — and check what got written before it ships.
- **Verify the premise before building the feature.** "Extract location when adding" sounded
  straightforward until the originals were actually checked: **0 of 129 carry GPS**. The
  extraction is built and correct, but it would have silently done nothing. *Lesson:* scan
  the real data before writing the code that depends on it.
- **"It doesn't work" can mean "it works and looks broken."** `/journal/rss.xml` returned
  200 with valid XML the whole time. The defect was presentational, and no amount of
  checking the endpoint would have found it. *Lesson:* reproduce the user's actual
  experience, not the technical contract.
- **A tag page holding one item is worse than no tag page.** Faceting only earns its keep
  once there's enough content to face. *Lesson:* match navigation density to content volume.
- **Scaffolding needs somewhere safe to live.** Without a `draft` flag the only options for
  an unfinished entry were "publish it half-written" or "don't write it". *Lesson:* give
  work-in-progress a first-class state before asking anyone to produce drafts.

---

## [0.5.0] - 2026-09-15

Workflow and maintainability pass on `dev`, alongside the Journal section.

### Added
- **`npm run validate`** — content integrity checks Zod can't express: unresolvable images,
  orphaned files, placeholder alt text, duplicate titles, `order` collisions, dangling
  journal references.
- **CI** (`.github/workflows/build-check.yml`) — validate + type check + build on PRs to
  `main`/`dev`. The first automated gate this repo has had.
- **`CLAUDE.md`** and `docs/` (content model, image workflow, deployment runbook). The README
  had pointed at a `docs/` folder that never existed.
- **Journal tag pages** (`/journal/tag/<tag>`) and an **RSS feed** (`/journal/rss.xml`).
  Tags had been rendering as inert pills.
- `npm run backfill-ai` — regenerates placeholder alt text and descriptions from the
  web-sized JPEG, so it no longer depends on the Drive originals.

### Changed
- **Photos moved from `public/photos/` to `src/assets/photos/`**, so Astro processes them at
  build time: responsive WebP `srcset` and intrinsic `width`/`height` on every image. Fixes
  masonry reflow and the missed LCP budget.
- **`order` is now an optional pin, not a sort key.** Canonical ordering is newest-first by
  `date`. The `order` field was stripped from all 127 photos.
- **Journal references are typed.** `coverImage` and `relatedPhotos` use `reference('photos')`,
  so a bad slug fails the build instead of silently vanishing.
- **Reading time and cover alt text are derived**, not stored. `readingTime` and `coverAlt`
  fields removed.
- Filter state consolidated into `src/utils/filter.ts`; sorting into `src/utils/photos.ts`.
  Shared `PhotoCard` and `JournalCard` components replace four and two copies respectively.
- Scripts consolidated: `exif.mjs <audit|fix>`, `slugs.mjs <check|fix>`. Machine-specific
  paths moved to `PHOTO_SOURCE_DIR` in `.env`; Gemini model pinned via `.env` instead of an
  eight-model probe loop.
- JSON-LD now carries a real author and emits `BlogPosting` for journal entries,
  `Photograph` for photos.
- `profile-photo.jpg` reduced from 7.2 MB to 0.21 MB.

### Removed
- The `projects` collection, `/portfolio/[slug]` pages, `ProjectCard`/`ProjectHeader`/
  `ProjectLayout` — placeholder content building pages nothing linked to. The
  `/portfolio` → `/gallery` redirect stays.
- Dead code: `utils/seo.ts`, `utils/images.ts`, `EXIFBadge`, `ImageWithRatio` (zero usages).
- `npm.cmd` / `npx.cmd` root wrappers (see 0.4.0 — these were a local PATH workaround that
  had no business being committed).
- Three EXIF library spikes (`test-exif`, `test-exifreader`, `test-exiftool`); the decision
  they existed to make is baked into `add-photo.mjs`.

### Lessons Learned & Mistakes Avoided
- **A default on every row makes a sort key meaningless.** `order` was assigned per-category
  but sorted globally, so the "All" view interleaved categories by a number with no
  cross-category meaning — and two photos silently shared `order: 4`. *Lesson:* if a field
  is set on every record, it can't also be the exception mechanism. Make the pin optional and
  let a real attribute (`date`) carry the ordering.
- **`public/` opts an image out of every optimization the framework offers.** 129 MB of
  full-size JPEGs were served with no `srcset` and no intrinsic dimensions, which is also
  what made the masonry grid reflow while loading. *Lesson:* in Astro, `src/assets` is the
  default and `public/` is the exception, not the other way round.
- **Astro's `<Image widths={...}>` still emits a full-resolution fallback `src` unless you
  also pass `width`.** The first build produced a 211 MB `dist/` with 3.7 MB "thumbnails".
  *Lesson:* check the generated markup, not just that the build exited 0.
- **Untyped cross-collection references fail silently.** `relatedPhotos` resolved with
  `.map(find).filter(Boolean)`, so a typo'd slug just disappeared from the page.
  *Lesson:* `reference()` converts a silent content bug into a build error.
- **Duplicated client state diverges on defaults, not on logic.** Four implementations of
  "read `?filter=`" disagreed about what to do when the param was absent, which cost three
  separate bug-fix commits. *Lesson:* extract the *default*, not just the getter.
- **Ingest fallbacks are invisible without a check for them.** 92 of 127 photos were sitting
  on `alt: "A people photograph"` — the AI fallback text — with nothing surfacing it.
  *Lesson:* when a pipeline degrades gracefully, something must report how often it degraded.

---

## [0.4.0] - 2026-08-04

### Added / Completed
- **Project Scaffolding:** Completed the full Astro 4.0 build (Phases 1-6), scaffolding all layouts, content collections, components (including React Lightbox), and utility scripts. 
- **Bug Fix (PATH):** Created local `npm.cmd` and `npx.cmd` wrappers in the root directory to fix execution issues where `npm` wasn't globally accessible by PowerShell without a terminal restart. Also updated the global Windows `$env:Path` for Node.js.

### Lessons Learned & Mistakes Avoided
- **Sitemap Integration Build Failures:** Astro's sitemap integration (`@astrojs/sitemap`) failed during the static build generation phase due to mismatched config expectations on Windows. *Lesson:* In early scaffolding phases, keep build dependencies lean. Removed the sitemap integration temporarily to guarantee a successful static build for visual review. 
- **Toolchain Environment Persistence:** A successful software installation (like Node.js via background task) doesn't inject its `bin` paths into an *already running* terminal session. *Lesson:* Always verify terminal environment variables or restart the session immediately after installing global CLIs.

---

## [0.3.0] - 2026-08-04

### Added / Harmonized
- Fully blended all original initial prompt directives (hardware context, exclusions, image workflow details, security model, Git rules, complete 18-file documentation checklist, and 7 Approval Gates) with the new ultra-modern design tokens and component architecture specifications in [initial_prompt.md](file:///v:/Personal%20Projects/app/prompts/initial_prompt.md).
- Ensured zero instruction duplication while preserving 100% of the initial prompt scope and strict Gate 1 stopping criteria.

### Lessons Learned & Mistakes Avoided
- **Loss of Directive Context during Refactoring:** Replacing prompt text can inadvertently drop critical original directives (such as equipment notes, security rules, or multi-stage approval gates). *Lesson:* Always perform a complete section-by-section diff check against original source files when enhancing master AI prompts to ensure complete specification retention.

---

## [0.2.0] - 2026-08-04

### Added
- Created `changelog/CHANGELOG.md` to track prompt updates, structural changes, and key design decisions.
- Significantly expanded `prompts/initial_prompt.md` into an exhaustive, production-grade **One-Shot Master Prompt for AI Web Building**.
- Defined comprehensive visual design tokens (editorial dark theme, typography scales, glassmorphic accents, fluid grids).
- Defined precise file tree architecture, Astro Content Collection schemas, component hierarchies, responsive image ingestion specs, accessibility standards (WCAG 2.2 AA), performance budgets, and testing rules.

### Changed
- Refocused initial Version One project scope from commercial monetization (licensing, fine-art print catalog, paid service booking) to a **pure photography portfolio showcase**.
- Simplified contact architecture to direct contact form and mailto links.
- Deferred e-commerce, shopping cart, and complex business logic to Phase 2.

### Lessons Learned & Mistakes Avoided
- **Scope Creep in V1:** Designing monetization and complex e-commerce rules in initial prompt delayed building the core visual portfolio. *Lesson:* Establish a rock-solid, ultra-high aesthetic photography portfolio presentation first before layering business logic.
- **Underspecified Design Tokens:** Vague requests for "modern design" lead to generic UI outputs. *Lesson:* Provide explicit font stacks, color palettes (zinc/neutral dark modes with editorial warmth), aspect ratio rules, and fluid typography tokens directly in the initial AI prompt.
- **Silent Asset Overwrites:** Original image assets must never be modified or overwritten in ingestion. *Lesson:* Enforce strict, read-only input ingestion rules that output variants to a isolated build cache/dir with manifest validation.

---

## [0.1.0] - 2026-08-04

### Added
- Initial creation and cleanup of `prompts/initial_prompt.md`.
- Formatted prompt into clean GitHub-flavored Markdown.
