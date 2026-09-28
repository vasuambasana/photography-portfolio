// Build-time facts measured from the photographs, shared by every page that needs them.
// Server only: it reads the source JPEGs with sharp. Computed once per build (the promise
// is cached), so 127 photo pages asking for it cost one pass over the archive, not 127.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import sharp from 'sharp';
import { getCollection } from 'astro:content';
import { archiveSwatches, colourRhyme, paletteFromPixels, type ArchiveSwatch, type Paletted, type Swatch } from '../utils/palette';
import { exposureValue, parseShutter } from '../utils/exposure';

export interface PhotoFacts {
  slug: string;
  day: string;
  palette: Swatch[];
  /** EV at ISO 100, when aperture, shutter and ISO were all recorded. */
  ev: number | null;
  /** Shutter speed in seconds, when recorded. */
  seconds: number | null;
}

export interface Archive {
  facts: Map<string, PhotoFacts>;
  swatches: ArchiveSwatch[];
  rhymes: Map<string, string>;
}

const PHOTOS_DIR = path.join(process.cwd(), 'src/content/photos');

// The collection gives processed image metadata, not the source path, so read the
// markdown's own `image:` field and resolve it the way Astro does.
async function sourceOf(id: string): Promise<string> {
  const file = path.join(PHOTOS_DIR, id);
  const { data } = matter(await readFile(file, 'utf8'));
  return path.resolve(path.dirname(file), String(data.image));
}

async function paletteOf(file: string): Promise<Swatch[]> {
  const { data } = await sharp(file)
    .resize(48, 48, { fit: 'inside' })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });
  return paletteFromPixels(data, 5);
}

async function build(): Promise<Archive> {
  const photos = await getCollection('photos');
  const facts = new Map<string, PhotoFacts>();

  await Promise.all(
    photos.map(async (p) => {
      const palette = await paletteOf(await sourceOf(p.id));
      facts.set(p.slug, {
        slug: p.slug,
        day: p.data.date.toISOString().slice(0, 10),
        palette,
        ev: exposureValue(p.data.cameraSpecs),
        seconds: parseShutter(p.data.cameraSpecs?.shutterSpeed),
      });
    })
  );

  const items: Paletted[] = [...facts.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  const rhymes = new Map<string, string>();
  for (const item of items) {
    const rhyme = colourRhyme(items, item.slug);
    if (rhyme) rhymes.set(item.slug, rhyme.slug);
  }

  return { facts, swatches: archiveSwatches(items), rhymes };
}

let cached: Promise<Archive> | undefined;

export function getArchive(): Promise<Archive> {
  cached ??= build();
  return cached;
}
