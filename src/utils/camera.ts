/**
 * Display names for camera bodies.
 *
 * Frontmatter keeps the body exactly as EXIF wrote it, because that is the record.
 * Some makers write a model code rather than a name ("samsung SM-S908U1"), which
 * means nothing to a reader, so pages show the name the phone was sold under.
 * Every entry here was checked against the maker's model number, and for the
 * Samsungs the file's own LensModel tag names the same phone.
 */
const MODEL_NAMES: Record<string, string> = {
  'samsung sm-s908u1': 'Samsung Galaxy S22 Ultra',
  'samsung sm-n976u': 'Samsung Galaxy Note10+ 5G',
  'oneplus gm1917': 'OnePlus 7 Pro',
  'canon eos r5m2': 'Canon EOS R5 Mark II',
};

/** Human camera name, or null when there is nothing real to show. */
export function cameraName(body: string | undefined): string | null {
  const raw = body?.trim();
  if (!raw || /^unknown\b/i.test(raw)) return null;

  const named = MODEL_NAMES[raw.toLowerCase()];
  if (named) return named;

  // Samsung writes its make in lower case; nothing else about the model needs changing.
  return raw.replace(/^samsung\b/, 'Samsung');
}

type Specs = {
  body?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
};

/** One line of settings, e.g. "Canon EOS R5 Mark II · 200mm · f/2.8 · 1/1250s · ISO 100". */
export function specLine(specs: Specs | undefined): string {
  if (!specs) return '';
  const focal = specs.focalLength?.replace(/\s*\(35mm eq\)/, '').replace(/\.0mm$/, 'mm');
  return [cameraName(specs.body), focal, specs.aperture, specs.shutterSpeed, specs.iso && `ISO ${specs.iso}`]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Whether a body is a phone (true), a dedicated camera (false), or unknown (null). From
 * the make the file records, nothing else.
 */
export function isPhone(body: string | undefined): boolean | null {
  const raw = body?.trim().toLowerCase();
  if (!raw || /^unknown\b/.test(raw)) return null;
  if (/\b(samsung|oneplus|apple|iphone|pixel|google|galaxy|xiaomi|huawei|motorola)\b/.test(raw)) return true;
  if (/\b(canon|nikon|sony|fujifilm|fuji|panasonic|olympus|om system|leica|pentax|ricoh|hasselblad)\b/.test(raw)) return false;
  return null;
}

/**
 * A focal length that can be compared across cameras: a phone's 35mm-equivalent figure,
 * or a dedicated camera's lens. A phone's raw focal length (6.4mm) means nothing next to
 * a lens on a camera, so it is left out rather than converted by guesswork.
 */
export function comparableFocal(specs: { body?: string; focalLength?: string } | undefined): number | null {
  const focal = specs?.focalLength?.trim();
  const match = focal?.match(/^(\d+(?:\.\d+)?)\s*mm/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!(value > 0)) return null;
  if (/35mm eq/i.test(focal!)) return value;
  return isPhone(specs?.body) === false ? value : null;
}
