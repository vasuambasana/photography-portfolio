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
