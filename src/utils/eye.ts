// "Your eye" (Labs, gallery): what a visitor's own looking says about them, from the
// photographs they have opened. Every line is a count over those photographs' recorded
// settings and measured colours; nothing about the visitor leaves their browser.

export interface EyePhoto {
  slug: string;
  category: string;
  /** EV at ISO 100, when the file recorded enough to work it out. */
  ev: number | null;
  /** A focal length comparable across cameras (utils/camera.ts comparableFocal). */
  focal: number | null;
  camera: string | null;
  /** true a phone, false a dedicated camera, null unknown. */
  phone: boolean | null;
  year: number;
  /** Colour families the photograph holds (utils/palette.ts), neutrals included. */
  colours: string[];
}

export type Lean = 'wide' | 'normal' | 'long';

export interface Eye {
  count: number;
  afterDark: { n: number; of: number } | null;
  focal: { median: number; lean: Lean; of: number } | null;
  /** Every category tied for the most opened. */
  subject: { categories: string[]; n: number } | null;
  /** Every colour family tied for the most held. */
  colour: { keys: string[]; n: number } | null;
  /** The camera seen most, only when one camera clearly leads. */
  camera: { name: string; n: number } | null;
  phones: { n: number; of: number } | null;
  years: [number, number] | null;
}

const NEUTRALS = new Set(['black', 'charcoal', 'grey', 'white']);
/** Below this, a night street or darker; the same line the home page's "after dark" uses. */
export const AFTER_DARK_EV = 5;
/** Too few known values and a figure says nothing. */
const ENOUGH = 3;

// The most common values, all of them when there is a tie: "more X than anything else"
// is only true when X is alone at the top.
function most<T extends string>(values: T[]): { values: T[]; n: number } | null {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  if (counts.size === 0) return null;
  const n = Math.max(...counts.values());
  return { values: [...counts].filter(([, c]) => c === n).map(([v]) => v).sort(), n };
}

export function leanOf(mm: number): Lean {
  if (mm < 28) return 'wide';
  return mm <= 70 ? 'normal' : 'long';
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function eyeProfile(photos: EyePhoto[]): Eye {
  const evs = photos.filter((p) => p.ev !== null);
  const focals = photos.map((p) => p.focal).filter((f): f is number => f !== null);
  const known = photos.filter((p) => p.phone !== null);
  const years = photos.map((p) => p.year);
  const colourful = photos.flatMap((p) => p.colours.filter((c) => !NEUTRALS.has(c)));
  const colour = most(colourful.length ? colourful : photos.flatMap((p) => p.colours));
  const subject = most(photos.map((p) => p.category));
  const camera = most(photos.map((p) => p.camera).filter((c): c is string => Boolean(c)));
  const focalMedian = focals.length >= ENOUGH ? Math.round(median(focals)) : null;

  return {
    count: photos.length,
    afterDark: evs.length >= ENOUGH ? { n: evs.filter((p) => p.ev! < AFTER_DARK_EV).length, of: evs.length } : null,
    focal: focalMedian === null ? null : { median: focalMedian, lean: leanOf(focalMedian), of: focals.length },
    subject: subject && { categories: subject.values, n: subject.n },
    colour: colour && { keys: colour.values, n: colour.n },
    camera: camera && camera.values.length === 1 ? { name: camera.values[0], n: camera.n } : null,
    phones: known.length >= ENOUGH ? { n: known.filter((p) => p.phone).length, of: known.length } : null,
    years: years.length ? [Math.min(...years), Math.max(...years)] : null,
  };
}
