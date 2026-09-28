// Small pure helpers for the Labs cards and postcards (scripts/card-drawing.ts), kept
// here so they are tested.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "2023-04-22" -> "22 APR 2023", the way a postmark prints a date. */
export function postmarkDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * The place for the ring of a postmark: the recorded location, shortened to its first
 * part when the whole thing won't go round ("Death Valley National Park, California" ->
 * "DEATH VALLEY NATIONAL PARK"). Empty when no location was recorded; nothing is guessed.
 */
export function postmarkPlace(location: string | null | undefined, max = 28): string {
  const place = location?.trim().toUpperCase() ?? '';
  if (place.length <= max) return place;
  const first = place.split(',')[0].trim();
  return first.length <= max ? first : `${first.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Break text into lines no wider than `max`, measured by `measure` (a canvas's
 * measureText in the browser). Keeps the writer's own line breaks; a word too long for a
 * line is split across lines rather than running off the card.
 */
export function wrapWords(text: string, max: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= max) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      // A single word wider than the line: split it by characters.
      let rest = word;
      while (measure(rest) > max) {
        let cut = rest.length - 1;
        while (cut > 1 && measure(rest.slice(0, cut)) > max) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  // No trailing empty lines.
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines;
}

/**
 * A postcard is the photograph's own shape, so its front can be the whole photograph edge
 * to edge without cropping a thing. The short side is 1000px (1200 for near-square
 * frames, so the back has room for the note above the address), the long side whatever
 * the shape needs, up to 2600.
 */
export function postcardSize(width: number, height: number): { w: number; h: number } {
  const aspect = width / height;
  const short = aspect > 0.8 && aspect < 1.25 ? 1200 : 1000;
  const MAX = 2600;
  if (aspect >= 1) {
    const w = Math.min(Math.round(short * aspect), MAX);
    return { w, h: Math.round(w / aspect) };
  }
  const h = Math.min(Math.round(short / aspect), MAX);
  return { w: Math.round(h * aspect), h };
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BackLayout {
  /** Note beside the address (a wide card), or above it (a tall one). */
  wide: boolean;
  heading: { x: number; y: number };
  stamp: Box;
  postmark: { cx: number; cy: number; r: number; wavesFrom: number; wavesTo: number };
  /** The visitor's note: text starts at the top of this box. */
  note: Box;
  divider: { x1: number; y1: number; x2: number; y2: number };
  address: { x1: number; x2: number; ys: number[] };
  /** The printed caption: title baseline at y, then the settings and the address below. */
  caption: { x: number; y: number; w: number };
}

const MARGIN = 80;

/** Where everything on the back of a w x h postcard goes. */
export function backLayout(w: number, h: number): BackLayout {
  const wide = w / h >= 1.25;
  const stamp = { x: w - MARGIN - 170, y: 76, w: 170, h: 205 };
  const cx = stamp.x - 68;
  const cy = stamp.y + stamp.h - 40;
  const r = 92;
  const heading = { x: MARGIN, y: 116 };
  // The caption's title sits 150 up from the bottom, with two small lines under it.
  const caption = { x: MARGIN, y: h - 150, w: 0 };

  if (wide) {
    const dividerX = Math.round(w * 0.58);
    const top = Math.max(cy + r + 80, Math.round(h * 0.5));
    const bottom = h - 170;
    const step = (bottom - top) / 3;
    return {
      wide,
      heading,
      stamp,
      postmark: { cx, cy, r, wavesFrom: cx - r - 8, wavesTo: Math.max(dividerX + 24, cx - 330) },
      note: { x: MARGIN, y: 170, w: dividerX - MARGIN - 60, h: h - 230 - 170 },
      divider: { x1: dividerX, y1: 170, x2: dividerX, y2: h - 110 },
      address: { x1: dividerX + 60, x2: w - MARGIN, ys: [0, 1, 2, 3].map((i) => Math.round(top + i * step)) },
      caption: { ...caption, w: dividerX - MARGIN - 40 },
    };
  }

  const dividerY = Math.round(h * 0.6);
  const top = dividerY + 90;
  const bottom = h - 230;
  const step = (bottom - top) / 3;
  return {
    wide,
    heading,
    stamp,
    postmark: { cx, cy, r, wavesFrom: cx - r - 8, wavesTo: Math.max(MARGIN + 260, cx - 330) },
    note: { x: MARGIN, y: 360, w: w - MARGIN * 2, h: dividerY - 60 - 360 },
    divider: { x1: MARGIN, y1: dividerY, x2: w - MARGIN, y2: dividerY },
    address: { x1: MARGIN, x2: w - MARGIN, ys: [0, 1, 2, 3].map((i) => Math.round(top + i * step)) },
    caption: { ...caption, w: w - MARGIN * 2 },
  };
}

/** A stamp's value: the photograph's shutter speed, "1/60s" as "1/60", "20s" as it is. */
export function stampValue(shutter: string | null | undefined): string {
  const s = shutter?.trim() ?? '';
  if (!s) return '';
  return s.includes('/') ? s.replace(/s$/, '') : s;
}
