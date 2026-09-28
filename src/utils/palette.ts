// Colour palettes measured from the photographs themselves, for the colour rhymes and
// the gallery's colour filter. Pure functions: the pixels come from sharp at build time
// (utils/palettes.server.ts), so everything here is deterministic and testable.
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

export function labToHex([L, a, b]: Lab): string {
  const fy = (L + 16) / 116;
  const x = fInv(fy + a / 500) * XN;
  const y = fInv(fy) * YN;
  const z = fInv(fy - b / 200) * ZN;
  const R = x * 3.2404542 - y * 1.5371385 - z * 0.4985314;
  const G = -x * 0.969266 + y * 1.8760108 + z * 0.041556;
  const B = x * 0.0556434 - y * 0.2040259 + z * 1.0572252;
  return '#' + [R, G, B].map((v) => fromLinear(v).toString(16).padStart(2, '0')).join('');
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

/** The palette of a photograph from its raw RGB pixels (3 bytes each). */
export function paletteFromPixels(rgb: Uint8Array | Buffer, k = 5): Swatch[] {
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
 * shortest distances first. Not always the exact optimum, but close for five colours.
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

export interface ArchiveSwatch {
  hex: string;
  lab: Lab;
  /** Photographs with a real share of this colour in them. */
  slugs: string[];
}

/**
 * A handful of colours that summarise the whole archive, each with the photographs that
 * hold it. Greys and near-blacks come first by lightness, then colours round the wheel.
 */
export function archiveSwatches(
  items: Paletted[],
  { k = 12, share = 0.18, minPhotos = 3 } = {}
): ArchiveSwatch[] {
  const points: Lab[] = [];
  const weights: number[] = [];
  for (const p of items) {
    for (const s of p.palette) {
      points.push(s.lab);
      // A colourful swatch counts for more than its area: a filter of twelve shades of
      // near-black would be no use to anyone.
      weights.push(s.weight * (1 + chroma(s.lab) / 20));
    }
  }
  const centres = kMeans(points, weights, k);

  const members = centres.map(() => [] as string[]);
  for (const p of items) {
    const held = centres.map(() => 0);
    for (const s of p.palette) {
      let best = 0;
      centres.forEach((c, j) => {
        if (deltaE(s.lab, c.lab) < deltaE(s.lab, centres[best].lab)) best = j;
      });
      held[best] += s.weight;
    }
    held.forEach((w, j) => {
      if (w >= share) members[j].push(p.slug);
    });
  }

  const neutral = (lab: Lab) => chroma(lab) < 12;
  return centres
    .map((c, j) => ({ hex: c.hex, lab: c.lab, slugs: members[j] }))
    .filter((s) => s.slugs.length >= minPhotos)
    .sort((a, b) => {
      if (neutral(a.lab) !== neutral(b.lab)) return neutral(a.lab) ? -1 : 1;
      return neutral(a.lab) ? a.lab[0] - b.lab[0] : hue(a.lab) - hue(b.lab);
    });
}
