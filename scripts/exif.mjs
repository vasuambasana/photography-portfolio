#!/usr/bin/env node

/**
 * exif.mjs: audit or backfill camera metadata on photo markdown files.
 *
 *   node scripts/exif.mjs audit   # report photos with missing/incomplete cameraSpecs
 *   node scripts/exif.mjs fix     # re-read EXIF from the originals and merge it in
 *
 * `fix` needs PHOTO_SOURCE_DIR (see .env.example) because the web-sized JPEGs in
 * src/assets have already been stripped of most of their metadata by sharp.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { CONTENT_DIR, SOURCE_DIR, requireSourceDir } from './lib/config.mjs';

const mode = process.argv[2];

if (!['audit', 'fix'].includes(mode)) {
  console.error('Usage: node scripts/exif.mjs <audit|fix>');
  process.exit(1);
}

const REQUIRED_SPECS = ['body', 'focalLength', 'aperture', 'shutterSpeed', 'iso'];

function photoFiles() {
  return fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md')).sort();
}

async function audit() {
  const files = photoFiles();
  const incomplete = [];

  for (const file of files) {
    const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8'));
    const specs = data.cameraSpecs || {};
    const missing = REQUIRED_SPECS.filter((k) => !specs[k]);
    if (missing.length) incomplete.push({ file, missing });
  }

  for (const { file, missing } of incomplete) {
    console.log(`${file.padEnd(46)} missing: ${missing.join(', ')}`);
  }

  console.log(`\n${files.length - incomplete.length}/${files.length} photos have complete EXIF.`);

  await auditDates(files);
  return incomplete.length;
}

/**
 * `date` is the canonical sort key for the whole gallery, so a wrong one silently
 * misplaces a photo. Three photos were once four months adrift because ingest fell
 * back to the current date when it couldn't read DateTimeOriginal.
 *
 * Needs the originals, so it's here rather than in validate.mjs (which CI runs
 * without access to PHOTO_SOURCE_DIR).
 */
async function auditDates(files) {
  if (!SOURCE_DIR || !fs.existsSync(SOURCE_DIR)) {
    console.log('\nSkipping date check. PHOTO_SOURCE_DIR not available.');
    return;
  }

  const exifr = (await import('exifr')).default;
  const drifted = [];
  let compared = 0;

  for (const file of files) {
    const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8'));
    if (!data.originalFilename || !data.category) continue;

    const original = path.join(SOURCE_DIR, data.category, data.originalFilename);
    if (!fs.existsSync(original)) continue;

    let taken;
    try {
      taken = (await exifr.parse(original, { pick: ['DateTimeOriginal'] }))?.DateTimeOriginal;
    } catch {
      continue;
    }
    if (!taken) continue;

    compared++;
    // Compare calendar days in the camera's own local time, so a timezone offset
    // doesn't read as a mismatch.
    const local = new Date(taken.getTime() - taken.getTimezoneOffset() * 60000);
    const exifDay = local.toISOString().slice(0, 10);
    const frontmatterDay = new Date(data.date).toISOString().slice(0, 10);

    const daysApart = Math.abs(new Date(frontmatterDay) - new Date(exifDay)) / 86400000;
    if (daysApart > 1.5) {
      drifted.push({ file, frontmatterDay, exifDay, daysApart: Math.round(daysApart) });
    }
  }

  if (drifted.length === 0) {
    console.log(`\nDates: all ${compared} checked photos match their EXIF capture date.`);
    return;
  }

  console.log(`\nDates drifting from EXIF (${drifted.length} of ${compared}):`);
  for (const d of drifted) {
    console.log(`  ${d.file.padEnd(44)} frontmatter ${d.frontmatterDay}  exif ${d.exifDay}  (${d.daysApart}d)`);
  }
  console.log('These sort into the wrong place in the gallery. Fix the frontmatter date.');
}

function specsFromTags(tags) {
  const specs = {};

  const make = tags.Make?.trim() || '';
  const model = tags.Model?.trim() || '';
  const body = make && model
    ? (model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`)
    : model || make;
  if (body) specs.body = body;

  const lens = tags.LensModel || tags.Lens;
  if (lens) specs.lens = lens;

  if (tags.FocalLengthIn35mmFormat) {
    specs.focalLength = `${String(tags.FocalLengthIn35mmFormat).replace(/ ?mm$/, '')}mm (35mm eq)`;
  } else if (tags.FocalLength) {
    specs.focalLength = `${String(tags.FocalLength).replace(/ ?mm$/, '')}mm`;
  }

  const fnum = tags.FNumber ?? tags.Aperture;
  if (fnum) specs.aperture = `f/${fnum}`;

  if (tags.ExposureTime) {
    specs.shutterSpeed = tags.ExposureTime < 1
      ? `1/${Math.round(1 / tags.ExposureTime)}s`
      : `${tags.ExposureTime}s`;
  } else if (tags.ShutterSpeed) {
    specs.shutterSpeed = tags.ShutterSpeed;
  }

  if (tags.ISO) specs.iso = String(tags.ISO);

  return specs;
}

async function fix() {
  const sourceDir = requireSourceDir();
  const { exiftool } = await import('exiftool-vendored');

  let updated = 0;
  let skipped = 0;

  try {
    for (const file of photoFiles()) {
      const filePath = path.join(CONTENT_DIR, file);
      const parsed = matter(fs.readFileSync(filePath, 'utf-8'));
      const { data } = parsed;

      if (!data.originalFilename || !data.category) {
        console.log(`skip ${file}. No originalFilename/category`);
        skipped++;
        continue;
      }

      const originalPath = path.join(sourceDir, data.category, data.originalFilename);
      if (!fs.existsSync(originalPath)) {
        console.log(`skip ${file}. Original not found: ${data.originalFilename}`);
        skipped++;
        continue;
      }

      try {
        const specs = specsFromTags(await exiftool.read(originalPath));
        if (!Object.keys(specs).length) continue;

        const merged = { ...data.cameraSpecs, ...specs };
        if (JSON.stringify(data.cameraSpecs) === JSON.stringify(merged)) continue;

        data.cameraSpecs = merged;
        fs.writeFileSync(filePath, matter.stringify(parsed.content, data), 'utf-8');
        console.log(`updated ${file}`);
        updated++;
      } catch (err) {
        console.error(`error ${file}: ${err.message}`);
      }
    }
  } finally {
    await exiftool.end();
  }

  console.log(`\nUpdated ${updated} file(s), skipped ${skipped}.`);
}

if (mode === 'audit') await audit();
else await fix();
