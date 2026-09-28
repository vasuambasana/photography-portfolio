// Colour palettes measured from the photographs themselves, for the colour rhymes, the
// gallery's colour filter, colour match and the photo pages' accent. Pure functions: the
// pixels come from sharp at build time (data/archive.ts) or from a canvas in the browser,
// so everything here is deterministic and testable.
//
// Colours are compared in CIELAB, where equal distances look like roughly equal
// differences to a person. RGB distances don't: two dark blues can be "far apart" in RGB
// and indistinguishable on screen.

export type Lab = [number, number, number];

export interface Swatch {
  /** sRGB hex, for showing the colour. */
  hex: string;
  lab: Lab;
  /** Share of the photograph in this colour, 0 to 1. */
  weight: number;
}

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
};

// D65 white point.
const XN = 0.95047;
const YN = 1;
const ZN = 1.08883;
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 24389) / 27 / 116 + 16 / 116);
const fInv = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : ((116 * t - 16) * 27) / 24389);

export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  const x = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / XN;
  const y = (R * 0.2126729 + G * 0.7151522 + B * 0.072175) / YN;
  const z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / ZN;
  const fy = f(y);
  return [116 * fy - 16, 500 * (f(x) - fy), 200 * (fy - f(z))];
}

export type Rgb = [number, number, number];

/** Lab to 8-bit sRGB, clipped into gamut. */
export function labToRgb([L, a, b]: Lab): Rgb {
  const fy = (L + 16) / 116;
  const x = fInv(fy + a / 500) * XN;
  const y = fInv(fy) * YN;
  const z = fInv(fy - b / 200) * ZN;
  const R = x * 3.2404542 - y * 1.5371385 - z * 0.4985314;
  const G = -x * 0.969266 + y * 1.8760108 + z * 0.041556;
  const B = x * 0.0556434 - y * 0.2040259 + z * 1.0572252;
  return [fromLinear(R), fromLinear(G), fromLinear(B)];
}

export function labToHex(lab: Lab): string {
  return '#' + labToRgb(lab).map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** WCAG relative luminance of an sRGB colour. */
export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function deltaE(p: Lab, q: Lab): number {
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/**
 * Weighted k-means. Seeds are chosen deterministically (heaviest point, then whichever
 * is farthest from the seeds so far), so the same photograph always gives the same
 * palette and the build is reproducible.
 */
export function kMeans(points: Lab[], weights: number[], k: number, iterations = 12): Swatch[] {
  if (points.length === 0) return [];
  const total = weights.reduce((s, w) => s + w, 0) || 1;

  let heaviest = 0;
  weights.forEach((w, i) => {
    if (w > weights[heaviest]) heaviest = i;
  });
  const centres: Lab[] = [points[heaviest]];
  while (centres.length < Math.min(k, points.length)) {
    let best = -1;
    let bestD = -1;
    points.forEach((p, i) => {
      const d = Math.min(...centres.map((c) => deltaE(p, c))) * Math.sqrt(weights[i]);
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    });
    if (bestD <= 0) break;
    centres.push(points[best]);
  }

  let assignment = new Array<number>(points.length).fill(0);
  for (let round = 0; round < iterations; round++) {
    assignment = points.map((p) => {
      let best = 0;
      centres.forEach((c, j) => {
        if (deltaE(p, c) < deltaE(p, centres[best])) best = j;
      });
      return best;
    });
    centres.forEach((_, j) => {
      let w = 0;
      const sum: Lab = [0, 0, 0];
      points.forEach((p, i) => {
        if (assignment[i] !== j) return;
        w += weights[i];
        sum[0] += p[0] * weights[i];
        sum[1] += p[1] * weights[i];
        sum[2] += p[2] * weights[i];
      });
      if (w > 0) centres[j] = [sum[0] / w, sum[1] / w, sum[2] / w];
    });
  }

  const mass = centres.map(() => 0);
  assignment.forEach((j, i) => (mass[j] += weights[i]));
  return centres
    .map((lab, j) => ({ lab, hex: labToHex(lab), weight: mass[j] / total }))
    .filter((s) => s.weight > 0)
    .sort((a, b) => b.weight - a.weight);
}

/** Colours per palette: enough to catch a small vivid accent, few enough to compare fast. */
export const PALETTE_SIZE = 8;

/** The palette of a photograph from its raw RGB pixels (3 bytes each). */
export function paletteFromPixels(rgb: Uint8Array | Buffer | Uint8ClampedArray, k = PALETTE_SIZE): Swatch[] {
  // Bucket near-identical pixels first: a 48px thumbnail has ~2,300 pixels, and most of
  // a sky is the same few colours.
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 2 < rgb.length; i += 3) {
    const key = ((rgb[i] >> 3) << 10) | ((rgb[i + 1] >> 3) << 5) | (rgb[i + 2] >> 3);
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bucket.n++;
    bucket.r += rgb[i];
    bucket.g += rgb[i + 1];
    bucket.b += rgb[i + 2];
    buckets.set(key, bucket);
  }
  const points: Lab[] = [];
  const weights: number[] = [];
  for (const { n, r, g, b } of buckets.values()) {
    points.push(rgbToLab(r / n, g / n, b / n));
    weights.push(n);
  }
  return kMeans(points, weights, k);
}

/**
 * How different two palettes look, 0 for identical: roughly the least colour change
 * (in delta E, weighted by area) that turns one photograph's colours into the other's.
 * A blue photograph with an orange accent and an orange photograph with a blue accent
 * hold the same colours, but in the wrong amounts, so they come out far apart.
 *
 * This is a greedy earth mover's distance: move as much area as possible along the
 * shortest distances first. Not always the exact optimum, but close for a handful of colours.
 */
export function paletteDistance(a: Swatch[], b: Swatch[]): number {
  if (a.length === 0 || b.length === 0) return Infinity;
  const left = a.map((s) => s.weight);
  const right = b.map((s) => s.weight);
  const pairs = a
    .flatMap((s, i) => b.map((t, j) => ({ i, j, d: deltaE(s.lab, t.lab) })))
    .sort((p, q) => p.d - q.d || p.i - q.i || p.j - q.j);

  let cost = 0;
  for (const { i, j, d } of pairs) {
    const moved = Math.min(left[i], right[j]);
    if (moved <= 0) continue;
    cost += moved * d;
    left[i] -= moved;
    right[j] -= moved;
  }
  return cost;
}

/** Colourfulness of a colour: how far it is from grey. */
export const chroma = ([, a, b]: Lab) => Math.hypot(a, b);

/** Hue angle in degrees, for ordering swatches around the colour wheel. */
export const hue = ([, a, b]: Lab) => ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;

export interface Paletted {
  slug: string;
  /** Capture date as YYYY-MM-DD: one shoot. */
  day: string;
  palette: Swatch[];
}

/**
 * The photograph whose colours are closest to this one, taken in a different year, or
 * failing that on a different day. Never one from the same shoot: two frames from the
 * same evening matching is no surprise.
 */
export function colourRhyme(items: Paletted[], slug: string): { slug: string; distance: number } | null {
  const me = items.find((p) => p.slug === slug);
  if (!me || me.palette.length === 0) return null;
  const year = me.day.slice(0, 4);

  const nearest = (pool: Paletted[]) => {
    let best: { slug: string; distance: number } | null = null;
    for (const p of pool) {
      const distance = paletteDistance(me.palette, p.palette);
      if (Number.isFinite(distance) && (!best || distance < best.distance)) best = { slug: p.slug, distance };
    }
    return best;
  };

  return (
    nearest(items.filter((p) => p.day.slice(0, 4) !== year)) ??
    nearest(items.filter((p) => p.day !== me.day))
  );
}

export interface ColourFamily {
  key: string;
  /** Plain name, for labels: "pale blue". */
  name: string;
  /** Share of a photograph that has to be this colour for it to count as holding it. */
  share: number;
  test: (lab: Lab) => boolean;
}

const NEUTRAL = 12;
const inHue = (lab: Lab, from: number, to: number) => {
  const h = hue(lab);
  return from <= to ? h >= from && h < to : h >= from || h < to;
};
const coloured = (lab: Lab) => chroma(lab) >= NEUTRAL;

/**
 * The colours people name, as regions of Lab. A palette colour belongs to the first
 * family that claims it, so the order matters: greys before anything, then brown (a dark,
 * muted orange is brown, not orange), then round the wheel. Vivid colours need less of
 * the frame to count, because a small red is still the thing you notice.
 */
export const FAMILIES: ColourFamily[] = [
  { key: 'black', name: 'black', share: 0.3, test: (l) => !coloured(l) && l[0] < 16 },
  { key: 'charcoal', name: 'charcoal', share: 0.25, test: (l) => !coloured(l) && l[0] >= 16 && l[0] < 40 },
  { key: 'grey', name: 'grey', share: 0.2, test: (l) => !coloured(l) && l[0] >= 40 && l[0] < 72 },
  { key: 'white', name: 'white', share: 0.15, test: (l) => !coloured(l) && l[0] >= 72 },
  { key: 'brown', name: 'brown', share: 0.12, test: (l) => coloured(l) && inHue(l, 20, 78) && l[0] < 50 && chroma(l) < 40 },
  { key: 'pink', name: 'pink', share: 0.06, test: (l) => coloured(l) && inHue(l, 340, 22) },
  { key: 'red', name: 'red', share: 0.06, test: (l) => coloured(l) && inHue(l, 22, 50) },
  { key: 'orange', name: 'orange', share: 0.06, test: (l) => coloured(l) && inHue(l, 50, 78) },
  { key: 'yellow', name: 'yellow', share: 0.06, test: (l) => coloured(l) && inHue(l, 78, 108) && l[0] >= 50 },
  { key: 'olive', name: 'olive', share: 0.1, test: (l) => coloured(l) && inHue(l, 78, 130) && l[0] < 50 },
  { key: 'green', name: 'green', share: 0.08, test: (l) => coloured(l) && inHue(l, 108, 175) },
  { key: 'teal', name: 'teal', share: 0.08, test: (l) => coloured(l) && inHue(l, 175, 220) },
  { key: 'pale-blue', name: 'pale blue', share: 0.08, test: (l) => coloured(l) && inHue(l, 220, 300) && l[0] >= 58 },
  { key: 'blue', name: 'blue', share: 0.08, test: (l) => coloured(l) && inHue(l, 220, 300) && l[0] >= 25 },
  { key: 'deep-blue', name: 'deep blue', share: 0.12, test: (l) => coloured(l) && inHue(l, 220, 300) },
  { key: 'violet', name: 'violet', share: 0.06, test: (l) => coloured(l) && inHue(l, 300, 340) },
];

export function familyOf(lab: Lab): ColourFamily {
  // Every colour lands somewhere: the hue families cover the whole wheel.
  return FAMILIES.find((f) => f.test(lab)) ?? FAMILIES[0];
}

export interface ArchiveSwatch {
  key: string;
  name: string;
  /** The family's colour as it appears in these photographs, for showing it. */
  hex: string;
  lab: Lab;
  /** Photographs with a real share of this colour in them. */
  slugs: string[];
}

/**
 * The colours of the whole archive, each with the photographs that hold it: one swatch
 * per colour family that at least `minPhotos` photographs hold. Each swatch shows the
 * family's colour as it actually appears in those photographs (the vivid ones counted a
 * little more, so "red" looks red rather than the average of every dull red), in family
 * order: greys dark to light, brown, then round the wheel.
 */
export function archiveSwatches(items: Paletted[], { minPhotos = 3 } = {}): ArchiveSwatch[] {
  return FAMILIES.map((family) => {
    const slugs: string[] = [];
    const sum: Lab = [0, 0, 0];
    let total = 0;
    for (const p of items) {
      const mine = p.palette.filter((s) => familyOf(s.lab) === family);
      const share = mine.reduce((acc, s) => acc + s.weight, 0);
      if (share < family.share) continue;
      slugs.push(p.slug);
      for (const s of mine) {
        const w = s.weight * (1 + (chroma(s.lab) / 20) ** 2);
        sum[0] += s.lab[0] * w;
        sum[1] += s.lab[1] * w;
        sum[2] += s.lab[2] * w;
        total += w;
      }
    }
    const lab: Lab = total > 0 ? [sum[0] / total, sum[1] / total, sum[2] / total] : [0, 0, 0];
    return { key: family.key, name: family.name, hex: labToHex(lab), lab, slugs };
  }).filter((s) => s.slugs.length >= minPhotos);
}

/** Mix two sRGB colours; t = 0 is all `a`. */
export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(a[i] * (1 - t) + b[i] * t)) as Rgb;
}

// The theme surfaces the accent has to read on (global.css).
const LIGHT_SURFACES: Rgb[] = [[250, 250, 250], [255, 255, 255], [244, 244, 245]];
const DARK_SURFACES: Rgb[] = [[9, 9, 11], [18, 18, 21], [28, 28, 33]];

export interface Accent {
  light: Rgb;
  dark: Rgb;
}

/**
 * A photograph's own colour, made safe to use as the page's accent: its most vivid colour
 * that covers a real part of the frame, darkened for the light theme and lightened for
 * the dark one until it reads at 4.5:1 on every surface it can land on. Null for a
 * photograph without a real colour in it: that page keeps the site's own accent.
 */
export function accentFromPalette(palette: Swatch[], { minChroma = 20, minWeight = 0.03 } = {}): Accent | null {
  const candidates = palette.filter((s) => chroma(s.lab) >= minChroma && s.weight >= minWeight);
  if (candidates.length === 0) return null;
  const score = (s: Swatch) => chroma(s.lab) * Math.sqrt(s.weight);
  const pick = candidates.reduce((a, b) => (score(b) > score(a) ? b : a));
  const [L, A, B] = pick.lab;
  const at = (l: number) => labToRgb([l, A, B]);
  const readsOn = (rgb: Rgb, surfaces: Rgb[]) => surfaces.every((bg) => contrast(rgb, bg) >= 4.5);

  let light = Math.min(L, 62);
  while (light > 0 && !readsOn(at(light), LIGHT_SURFACES)) light -= 1;
  let dark = Math.max(L, 55);
  while (dark < 100 && !readsOn(at(dark), DARK_SURFACES)) dark += 1;
  return { light: at(light), dark: at(dark) };
}

/**
 * The page background, leaning towards the accent by as much as it can (up to `max`)
 * while the secondary text on it still reads at 4.5:1.
 */
export function tintedSurface(surface: Rgb, accent: Rgb, text: Rgb, max: number): Rgb {
  for (let t = max; t > 0; t -= 0.005) {
    const tinted = mix(surface, accent, t);
    if (contrast(text, tinted) >= 4.5) return tinted;
  }
  return surface;
}
