---
name: design-system
description: >
  Design tokens, type scale, spacing and visual rules for the photography portfolio.
  Load BEFORE writing or editing any .astro, .css or .tsx that affects layout, colour,
  typography, spacing or motion, including new pages, new components, and any redesign
  work. Also load when reviewing UI for consistency.
---

# Design system

The photographs are the content. Everything here exists to get out of their way.

Tokens are CSS custom properties in `src/styles/global.css`, surfaced as Tailwind tokens
in `tailwind.config.mjs`. **Never hardcode a hex value or a raw Tailwind colour**:
`bg-zinc-50` is wrong, `bg-surface-main` is right. Hardcoded colours don't theme.

## Colour

**Light is the default.** `.dark` is the variant, toggled by a class on `<html>`.
The original spec in `prompts/initial_prompt.md` says dark-first; that is out of date.
Don't "fix" it.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `surface-main` | zinc-50 `250 250 250` | zinc-950 `9 9 11` | Page background |
| `surface-card` | white | `18 18 21` | Raised cards, spec plaques |
| `surface-overlay` | zinc-100 `244 244 245` | `28 28 33` | Pills, filter chips, image placeholders |
| `text-primary` | zinc-950 | zinc-100 | Headings, body emphasis |
| `text-secondary` | zinc-500 | zinc-400 | Body copy, metadata |
| `text-accent` | violet-600 `124 58 237` | violet-400 `167 139 250` | Links, hover, focus |
| `border-subtle` | `rgba(0,0,0,.1)` | `rgba(255,255,255,.08)` | All hairlines |

Colours are stored as space-separated RGB channels so Tailwind's `/<alpha-value>` works:
`bg-surface-card/80`, `text-text-secondary/70`.

Extra CSS vars: `--glass-bg` (translucent nav background), `--selection-bg`.

**Over a photograph**, tokens don't apply. Use explicit `white/…` and `black/…` opacities,
since the surface underneath is the image, not the theme.

## Typography

Three families, each with one job:

| Family | Token | Used for |
| --- | --- | --- |
| Newsreader (serif) | `font-display` | Headings, titles, pull quotes, subtitles |
| Inter | `font-body` | Body copy, UI, buttons |
| JetBrains Mono | `font-mono` | EXIF values, dates, category labels, counts, tags |

Use the scale tokens, never raw `text-2xl`:

| Token | Size |
| --- | --- |
| `text-display-xl` | `clamp(2.5rem, 5vw, 4.5rem)` |
| `text-display-lg` | `clamp(2rem, 4vw, 3.5rem)` |
| `text-display-md` | `clamp(1.5rem, 3vw, 2.5rem)` |
| `text-body-lg` / `-md` / `-sm` | 1.125 / 1 / 0.875rem |
| `text-caption` | 0.75rem, `0.05em` tracking |

Small uppercase mono labels are the house signature: `text-[10px] font-mono uppercase
tracking-[0.15em]` (or `[0.2em]` for section eyebrows). Reach for this instead of inventing
a new label treatment.

## Layout

- `max-w-content` (104rem) for full-width sections; `max-w-prose` (42rem) for reading.
- `.section-container` is the standard page gutter. Use it rather than re-deriving padding.
- `rounded-card` (0.75rem) for grid cards; `rounded-2xl`/`rounded-3xl` for hero and feature
  surfaces; `rounded-full` for pills and buttons.
- Spacing tokens `spacing-section` and `spacing-content` are fluid `clamp()` values.
- `backdrop-blur-nav` (16px) + `--glass-bg` is the glassmorphic nav treatment.

## Images

- **Never crop or distort a photograph.** Native aspect ratio always. Masonry columns
  (`columns-*` + `break-inside-avoid`) exist precisely so photos keep their own shape.
  A fixed `aspect` on `PhotoCard` is only for secondary contexts like journal related-photos.
- Always go through `<Image>` from `astro:assets`. Never a bare `<img>` for a collection
  photo. Pass both `width` and `widths`, or Astro emits a full-resolution fallback `src`.
- Hover treatment is `scale-105` over `duration-700` with a bottom-anchored gradient.
  Use `PhotoCard` rather than rebuilding it.

## Motion

- Transitions 200-700ms, ease-out. `duration-700` for image scale, `duration-300` for
  overlays and colour.
- Everything must be wrapped by the existing `prefers-reduced-motion` guard in `global.css`.
  Scripts check `html.reduce-motion` (set in `MotionHead.astro`) or the media query.
- No motion that competes with the photographs. Motion should come from the photographs'
  own data where it can, not from decoration.

What exists, so it gets reused rather than rebuilt:

| Piece | Where | What it does |
| --- | --- | --- |
| Page transitions | `@view-transition` in `global.css`, `MotionHead.astro` | The clicked photo morphs into the next page's `#vt-photo`; photo to photo slides in filmstrip order |
| Develop | `img[data-develop]` + `--develop`, `scripts/develop.ts` | Photo comes up from dark over a duration set by its shutter speed (`developDuration()`) |
| Journal previews | `scripts/photo-preview.ts` | Hover or focus a photo link in an entry to see the frame and its settings |
| Theme aperture | `ThemeToggle.astro` | New theme opens through a hexagonal iris from the toggle |
| Ambient + lights down | `.photo-ambient`, `.lights-down` | Blurred copy of the photo behind it; page dims while it fills the screen |
| Sort by light | gallery `?sort=light`, `exposureValue()` | Darkest exposure first; filter and sort changes animate |
| Lightbox | `ClickableImage.tsx`, `Lightbox.tsx` | Zooms out of the page photo; swipe down to close, sideways to step |

Any new element given a `view-transition-name` must be unique on the page at the moment
of the transition, or the whole transition is skipped. Name elements just before a
transition and clear the name after, the way `MotionHead.astro` does.

## Accessibility (non-negotiable)

- Touch targets ≥ 44×44.
- Visible focus rings. Never `outline: none` without a replacement.
- Filter buttons carry `aria-pressed`; the current filmstrip thumb carries `aria-current`.
- The lightbox traps focus, closes on Escape, and restores focus to the trigger.
- One `<h1>` per page; don't skip heading levels for styling.
- Contrast ≥ 4.5:1 for body text in both themes.

## Voice

This is a personal archive, not a business. No copy should imply anything is for sale.
No "Inquire", "prints", "licensing", "commissions", "book a session", "client", "rates",
or "fine art" as a market label. No third-person agency voice. First person and plain
warmth. "Say Hello", not "Get a Quote". See the root `CLAUDE.md`.

## Banned

Carousels. Autoplay anything. Heavy drop shadows (`shadow-sm`/`shadow-lg` on cards is the
ceiling; `shadow-2xl` only on the hero). Multi-stop decorative gradients. Gradients are for
legibility over photographs, not decoration. Fake social proof, invented testimonials, fake
client logos. Parallax. Loading spinners on a static site.

## Before you finish

Open both themes. A change that only works in light mode is not done.
