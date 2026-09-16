#!/usr/bin/env node

/**
 * exif.mjs — audit or backfill camera metadata on photo markdown files.
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
import { CONTENT_DIR, requireSourceDir } from './lib/config.mjs';

const mode = process.argv[2];

if (!['audit', 'fix'].includes(mode)) {
  console.error('Usage: node scripts/exif.mjs <audit|fix>');
  process.exit(1);
}

const REQUIRED_SPECS = ['body', 'focalLength', 'aperture', 'shutterSpeed', 'iso'];

function photoFiles() {
  return fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md')).sort();
}

function audit() {
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
  return incomplete.length;
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
        console.log(`skip ${file} — no originalFilename/category`);
        skipped++;
        continue;
      }

      const originalPath = path.join(sourceDir, data.category, data.originalFilename);
      if (!fs.existsSync(originalPath)) {
        console.log(`skip ${file} — original not found: ${data.originalFilename}`);
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

if (mode === 'audit') audit();
else await fix();
