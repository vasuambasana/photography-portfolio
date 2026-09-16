---
name: design-system
description: >
  Design tokens, type scale, spacing and visual rules for the photography portfolio.
  Load BEFORE writing or editing any .astro, .css or .tsx that affects layout, colour,
  typography, spacing or motion — including new pages, new components, and any redesign
  work. Also load when reviewing UI for consistency.
---

# Design system

The photographs are the content. Everything here exists to get out of their way.

Tokens are CSS custom properties in `src/styles/global.css`, surfaced as Tailwind tokens
in `tailwind.config.mjs`. **Never hardcode a hex value or a raw Tailwind colour** —
`bg-zinc-50` is wrong, `bg-surface-main` is right. Hardcoded colours don't theme.

## Colour

**Light is the default.** `.dark` is the variant, toggled by a class on `<html>`.
The original spec in `prompts/initial_prompt.md` says dark-first — that is out of date.
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

**Over a photograph**, tokens don't apply — use explicit `white/…` and `black/…` opacities,
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

Small uppercase mono labels are the house signature — `text-[10px] font-mono uppercase
tracking-[0.15em]` (or `[0.2em]` for section eyebrows). Reach for this instead of inventing
a new label treatment.

## Layout

- `max-w-content` (104rem) for full-width sections; `max-w-prose` (42rem) for reading.
- `.section-container` is the standard page gutter — use it rather than re-deriving padding.
- `rounded-card` (0.75rem) for grid cards; `rounded-2xl`/`rounded-3xl` for hero and feature
  surfaces; `rounded-full` for pills and buttons.
- Spacing tokens `spacing-section` and `spacing-content` are fluid `clamp()` values.
- `backdrop-blur-nav` (16px) + `--glass-bg` is the glassmorphic nav treatment.

## Images

- **Never crop or distort a photograph.** Native aspect ratio always. Masonry columns
  (`columns-*` + `break-inside-avoid`) exist precisely so photos keep their own shape.
  A fixed `aspect` on `PhotoCard` is only for secondary contexts like journal related-photos.
- Always go through `<Image>` from `astro:assets` — never a bare `<img>` for a collection
  photo. Pass both `width` and `widths`, or Astro emits a full-resolution fallback `src`.
- Hover treatment is `scale-105` over `duration-700` with a bottom-anchored gradient.
  Use `PhotoCard` rather than rebuilding it.

## Motion

- Transitions 200–700ms, ease-out. `duration-700` for image scale, `duration-300` for
  overlays and colour.
- Everything must be wrapped by the existing `prefers-reduced-motion` guard in `global.css`.
- No motion that competes with the photographs.

## Accessibility (non-negotiable)

- Touch targets ≥ 44×44.
- Visible focus rings — never `outline: none` without a replacement.
- Filter buttons carry `aria-pressed`; the current filmstrip thumb carries `aria-current`.
- The lightbox traps focus, closes on Escape, and restores focus to the trigger.
- One `<h1>` per page; don't skip heading levels for styling.
- Contrast ≥ 4.5:1 for body text in both themes.

## Banned

Carousels. Autoplay anything. Heavy drop shadows (`shadow-sm`/`shadow-lg` on cards is the
ceiling; `shadow-2xl` only on the hero). Multi-stop decorative gradients — gradients are for
legibility over photographs, not decoration. Fake social proof, invented testimonials, fake
client logos. Parallax. Loading spinners on a static site.

## Before you finish

Open both themes. A change that only works in light mode is not done.
