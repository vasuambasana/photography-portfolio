#!/usr/bin/env node

/**
 * validate.mjs — content checks that the Zod schema can't express.
 *
 * Astro already fails the build on a bad schema or an unresolvable reference.
 * This catches the quieter problems: images on disk that nothing points at,
 * alt text that's really a filename, duplicate titles, colliding pins.
 *
 *   node scripts/validate.mjs
 *
 * Exits non-zero on any error so CI can gate on it. Warnings don't fail.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { CONTENT_DIR, JOURNAL_DIR, PHOTOS_DIR, VALID_CATEGORIES } from './lib/config.mjs';

const errors = [];
const warnings = [];

const error = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const IMAGE_EXT = /\.(jpe?g|png|webp|avif)$/i;

/** What add-photo.mjs writes when the Gemini call fails or hits quota. */
const PLACEHOLDER_ALT = /^an? \w+ photograph\.?$/i;
const PLACEHOLDER_BODY = /Replace this placeholder with your own description/i;

function readAll(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((file) => ({
      file,
      slug: file.replace(/\.md$/, ''),
      ...matter(fs.readFileSync(path.join(dir, file), 'utf-8')),
    }));
}

function walkImages(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkImages(full, base);
    return IMAGE_EXT.test(entry.name) ? [full] : [];
  });
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------
const photos = readAll(CONTENT_DIR);
const photoSlugs = new Set(photos.map((p) => p.slug));
const referencedImages = new Set();
const titles = new Map();
const pinsByCategory = new Map();
const placeholderAlt = [];
const placeholderBody = [];

if (photos.length === 0) error('No photos found in src/content/photos/');

for (const { file, data, content } of photos) {
  const where = `photos/${file}`;

  if (!data.image) {
    error(`${where}: missing image`);
  } else {
    const resolved = path.resolve(CONTENT_DIR, data.image);
    if (!fs.existsSync(resolved)) {
      error(`${where}: image not found on disk — ${data.image}`);
    } else {
      referencedImages.add(resolved);
      const expectedDir = path.join(PHOTOS_DIR, data.category || '');
      if (data.category && path.dirname(resolved) !== expectedDir) {
        warn(`${where}: image sits outside its category folder (${data.category})`);
      }
    }
  }

  if (data.category && !VALID_CATEGORIES.includes(data.category)) {
    error(`${where}: unknown category "${data.category}"`);
  }

  const alt = (data.alt || '').trim();
  if (!alt) {
    error(`${where}: missing alt text`);
  } else if (IMAGE_EXT.test(alt) || /^[a-z0-9_\-]+$/i.test(alt)) {
    error(`${where}: alt text looks like a filename — "${alt}"`);
  } else if (PLACEHOLDER_ALT.test(alt)) {
    placeholderAlt.push(where);
  } else if (alt.length < 15) {
    warn(`${where}: alt text is very short — "${alt}"`);
  }

  if (PLACEHOLDER_BODY.test(content)) placeholderBody.push(where);

  if (!data.date) error(`${where}: missing date`);

  if (data.title) {
    const key = data.title.trim().toLowerCase();
    if (titles.has(key)) {
      warn(`${where}: duplicate title "${data.title}" (also ${titles.get(key)})`);
    } else {
      titles.set(key, where);
    }
  }

  if (data.order !== undefined) {
    const cat = data.category || 'uncategorised';
    if (!pinsByCategory.has(cat)) pinsByCategory.set(cat, new Map());
    const pins = pinsByCategory.get(cat);
    if (pins.has(data.order)) {
      error(`${where}: order ${data.order} collides with ${pins.get(data.order)} in "${cat}"`);
    } else {
      pins.set(data.order, where);
    }
  }
}

// Orphaned images
for (const image of walkImages(PHOTOS_DIR)) {
  if (!referencedImages.has(image)) {
    warn(`orphan image (no markdown points at it): ${path.relative(PHOTOS_DIR, image)}`);
  }
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------
const journal = readAll(JOURNAL_DIR);
const tagSlugs = new Map();

for (const { file, data } of journal) {
  const where = `journal/${file}`;

  if (!data.coverImage) {
    error(`${where}: missing coverImage`);
  } else if (!photoSlugs.has(data.coverImage)) {
    error(`${where}: coverImage "${data.coverImage}" is not a photo slug`);
  }

  for (const related of data.relatedPhotos || []) {
    if (!photoSlugs.has(related)) {
      error(`${where}: relatedPhotos entry "${related}" is not a photo slug`);
    }
  }

  if (!data.excerpt?.trim()) error(`${where}: missing excerpt`);
  if (!data.date) error(`${where}: missing date`);

  for (const tag of data.tags || []) {
    const slug = tag.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) {
      error(`${where}: tag "${tag}" slugifies to nothing`);
      continue;
    }
    const seen = tagSlugs.get(slug);
    if (seen && seen !== tag) {
      warn(`tags "${seen}" and "${tag}" both map to /journal/tag/${slug}`);
    }
    tagSlugs.set(slug, tag);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
for (const w of warnings) console.log(`warn   ${w}`);
for (const e of errors) console.log(`ERROR  ${e}`);

// Reported as a count rather than one line each — this is a content backlog to work
// through, not something to fail a build over.
if (placeholderAlt.length) {
  console.log(
    `\nwarn   ${placeholderAlt.length}/${photos.length} photos still have placeholder alt text ` +
      `("A <category> photograph"). These are the AI-ingest fallbacks — run ` +
      `\`npm run backfill-ai\` or write them by hand.`
  );
}
if (placeholderBody.length) {
  console.log(`warn   ${placeholderBody.length} photos still have a placeholder description.`);
}

console.log(
  `\n${photos.length} photos, ${journal.length} journal entries, ${tagSlugs.size} tags — ` +
    `${errors.length} error(s), ${warnings.length + placeholderAlt.length + placeholderBody.length} warning(s).`
);

process.exit(errors.length > 0 ? 1 : 0);
