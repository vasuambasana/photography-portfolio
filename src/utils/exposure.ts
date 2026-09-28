/** "1/250s" -> 0.004, "20s" -> 20. Anything else is null: no guessing. */
export function parseShutter(value: string | undefined): number | null {
  const raw = value?.trim().replace(/s$/, '');
  if (!raw) return null;

  const fraction = raw.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (fraction) {
    const seconds = Number(fraction[1]) / Number(fraction[2]);
    return seconds > 0 ? seconds : null;
  }

  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

// The "develop" reveal maps a photo's own shutter speed onto how long it takes to
// appear. Log scale, because shutter speeds are: 1/8000s is the fast end, 30s the slow.
const FASTEST = Math.log2(1 / 8000);
const SLOWEST = Math.log2(30);
export const DEVELOP_MIN_MS = 220;
export const DEVELOP_MAX_MS = 900;
export const DEVELOP_DEFAULT_MS = 480;

/** How long a photo takes to develop on screen, from its shutter speed. */
export function developDuration(shutter: string | undefined): number {
  const seconds = parseShutter(shutter);
  if (seconds === null) return DEVELOP_DEFAULT_MS;

  const t = (Math.log2(seconds) - FASTEST) / (SLOWEST - FASTEST);
  const clamped = Math.min(1, Math.max(0, t));
  return Math.round(DEVELOP_MIN_MS + clamped * (DEVELOP_MAX_MS - DEVELOP_MIN_MS));
}

/** "f/2.8" -> 2.8. */
export function parseAperture(value: string | undefined): number | null {
  const n = Number(value?.trim().replace(/^f\//i, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "200.0mm" -> 200, "23mm (35mm eq)" -> 23. The number as recorded, nothing converted. */
export function parseFocal(value: string | undefined): number | null {
  const match = value?.trim().match(/^(\d+(?:\.\d+)?)\s*mm/i);
  const n = match ? Number(match[1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface Specs {
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
}

/**
 * Exposure value at ISO 100: how much light the scene had. Big numbers are bright
 * (sunlit snow is about 16), small numbers are dark (a lit street at night is about 5).
 * Null unless the file recorded aperture, shutter and ISO; nothing is estimated.
 */
export function exposureValue(specs: Specs | undefined): number | null {
  const t = parseShutter(specs?.shutterSpeed);
  const n = parseAperture(specs?.aperture);
  const iso = Number(specs?.iso);
  if (t === null || n === null || !(iso > 0)) return null;
  return Math.log2((n * n) / t) - Math.log2(iso / 100);
}

/** The gap between two values in stops (doublings), always positive. */
export function stopsBetween(a: number, b: number): number {
  return Math.abs(Math.log2(a / b));
}

/** 0.004 -> "1/250s", 20 -> "20s", 0.5 -> "1/2s", 1.3 -> "1.3s". */
export function formatShutter(seconds: number): string {
  if (seconds >= 1) return `${Number(seconds.toFixed(1))}s`;
  return `1/${Math.round(1 / seconds)}s`;
}
