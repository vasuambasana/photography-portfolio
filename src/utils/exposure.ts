import type { CollectionEntry } from 'astro:content';

type Specs = CollectionEntry<'photos'>['data']['cameraSpecs'];

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

/** "f/2.8" -> 2.8 */
export function parseAperture(value: string | undefined): number | null {
  const n = Number(value?.trim().replace(/^f\//i, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Exposure value normalised to ISO 100: how bright the scene was, in stops.
 * Higher is brighter. Null unless the file recorded all three settings.
 */
export function exposureValue(specs: Specs): number | null {
  const t = parseShutter(specs?.shutterSpeed);
  const n = parseAperture(specs?.aperture);
  const iso = Number(specs?.iso);
  if (t === null || n === null || !(iso > 0)) return null;
  return Math.log2((n * n) / t) - Math.log2(iso / 100);
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
