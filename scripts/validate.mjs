#!/usr/bin/env node

/**
 * validate.mjs: content checks that the Zod schema can't express.
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
import { CONTENT_DIR, JOURNAL_DIR, PHOTOS_DIR, ROOT, VALID_CATEGORIES } from './lib/config.mjs';

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
/** Lower-cased title -> slug, for spotting journal mentions that aren't links. */
const photoTitles = new Map(
  photos.filter((p) => p.data.title).map((p) => [p.data.title.trim().toLowerCase(), p.slug])
);
const referencedImages = new Set();
const titles = new Map();
const pinsByCategory = new Map();
const placeholderAlt = [];
const placeholderBody = [];
const unlocated = [];
const SPEC_KEYS = ['body', 'lens', 'focalLength', 'aperture', 'shutterSpeed', 'iso'];

if (photos.length === 0) error('No photos found in src/content/photos/');

for (const { file, data, content } of photos) {
  const where = `photos/${file}`;

  if (!data.image) {
    error(`${where}: missing image`);
  } else {
    const resolved = path.resolve(CONTENT_DIR, data.image);
    if (!fs.existsSync(resolved)) {
      error(`${where}: image not found on disk: ${data.image}`);
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
    error(`${where}: alt text looks like a filename: "${alt}"`);
  } else if (PLACEHOLDER_ALT.test(alt)) {
    placeholderAlt.push(where);
  } else if (alt.length < 15) {
    warn(`${where}: alt text is very short: "${alt}"`);
  }

  if (PLACEHOLDER_BODY.test(content)) placeholderBody.push(where);

  if (!data.date) error(`${where}: missing date`);

  // Specs come from EXIF or nowhere. "Unknown Body" is neither, and a key the schema
  // doesn't know is dropped silently at build time, so both are errors here.
  if (data.cameraSpecs) {
    for (const [key, value] of Object.entries(data.cameraSpecs)) {
      if (!SPEC_KEYS.includes(key)) {
        error(`${where}: cameraSpecs.${key} is not a schema field and never renders`);
      } else if (/\bunknown\b/i.test(String(value))) {
        error(`${where}: cameraSpecs.${key} is a placeholder ("${value}"). Delete it rather than guess`);
      }
    }
  }

  if (!String(data.location ?? '').trim()) unlocated.push(data.date);

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
let drafts = 0;

for (const { file, data, content } of journal) {
  const where = `journal/${file}`;

  if (data.draft) {
    drafts++;
    continue; // drafts are work in progress; they're stripped from production builds
  }

  // A published entry must not still be carrying scaffolding.
  if (/\[PLACEHOLDER/i.test(content) || /\[PLACEHOLDER/i.test(JSON.stringify(data))) {
    error(`${where}: published entry still contains [PLACEHOLDER]. Set draft: true or finish it`);
  }

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

  // An entry that names a photograph should let the reader go and look at it.
  // Titles are written in italics; the body is hard-wrapped, so a title can span
  // a line break. Matching without allowing that is exactly how one mention
  // stayed unlinked after the first pass.
  const unlinked = content.replace(/\[[^\]]*\]\([^)]*\)/g, ' ');
  for (const [, label] of unlinked.matchAll(/(?<![*[\w])\*([^*]+?)\*(?!\*)/g)) {
    const slug = photoTitles.get(label.replace(/\s+/g, ' ').trim().toLowerCase());
    if (slug) {
      warn(`${where}: mentions "${label.replace(/\s+/g, ' ')}" without linking it: /photo/${slug}`);
    }
  }

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
// Commercial language
//
// The site is a personal archive and nothing on it is for sale. The original spec
// described print catalogues and assignment inquiries, so this wording keeps drifting
// back in from that document. Only unambiguous terms are listed. "print" and "client"
// are omitted because they have legitimate code meanings (clientPhotos, client:load).
// ---------------------------------------------------------------------------
const COMMERCIAL = [
  /\binquir(e|y|ies)\b/i,
  /\blicensing\b/i,
  /\bcommissions?\b/i,
  /\bfor sale\b/i,
  /\bfine[- ]art\b/i,
  /\brate card\b/i,
  /\bbook a (session|shoot)\b/i,
];

function scanForCommercial(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanForCommercial(full);
      continue;
    }
    if (!/\.(astro|tsx?|md)$/.test(entry.name)) continue;
    if (entry.name === 'CLAUDE.md') continue; // it documents the banned words

    const lines = fs.readFileSync(full, 'utf-8').split('\n');
    lines.forEach((line, i) => {
      for (const pattern of COMMERCIAL) {
        if (pattern.test(line)) {
          const rel = path.relative(ROOT, full).replace(/\\/g, '/');
          error(`${rel}:${i + 1}: commercial language: "${line.trim().slice(0, 70)}"`);
          return;
        }
      }
    });
  }
}

scanForCommercial(path.join(ROOT, 'src'));

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
for (const w of warnings) console.log(`warn   ${w}`);
for (const e of errors) console.log(`ERROR  ${e}`);

// Reported as a count rather than one line each. This is a content backlog to work
// through, not something to fail a build over.
if (placeholderAlt.length) {
  console.log(
    `\nwarn   ${placeholderAlt.length}/${photos.length} photos still have placeholder alt text ` +
      `("A <category> photograph"). These are the AI-ingest fallbacks. Run ` +
      `\`npm run backfill-ai\` or write them by hand.`
  );
}
if (placeholderBody.length) {
  console.log(`warn   ${placeholderBody.length} photos still have a placeholder description.`);
}
if (unlocated.length) {
  const shoots = new Set(unlocated.map((d) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10)));
  console.log(
    `\nwarn   ${unlocated.length}/${photos.length} photos have no location, across ${shoots.size} capture dates. ` +
      `\`npm run locate list --missing\` groups them by shoot.`
  );
}

console.log(
  `\n${photos.length} photos, ${journal.length - drafts} published journal entries ` +
    `(+${drafts} draft), ${tagSlugs.size} tags: ` +
    `${errors.length} error(s), ${warnings.length + placeholderAlt.length + placeholderBody.length + (unlocated.length ? 1 : 0)} warning(s).`
);

process.exit(errors.length > 0 ? 1 : 0);
