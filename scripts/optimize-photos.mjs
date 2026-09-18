#!/usr/bin/env node

/**
 * optimize-photos.mjs: shrink oversized source JPEGs in src/assets/photos.
 *
 *   node scripts/optimize-photos.mjs             # optimize anything over 2 MB
 *   node scripts/optimize-photos.mjs --dry-run
 *   node scripts/optimize-photos.mjs --threshold 1.5
 *
 * Astro already generates responsive variants at build time, so this is only about
 * keeping the committed originals sane. Every run rewrites files in place and adds
 * another copy to git history, so don't run it habitually.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PHOTOS_DIR, VALID_CATEGORIES } from './lib/config.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const thresholdArg = args.indexOf('--threshold');
const thresholdMB = thresholdArg !== -1 ? Number(args[thresholdArg + 1]) : 2;
const THRESHOLD = thresholdMB * 1024 * 1024;

const MAX_WIDTH = 2560;
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);

let optimized = 0;
let savedBytes = 0;

for (const category of VALID_CATEGORIES) {
  const categoryDir = path.join(PHOTOS_DIR, category);
  if (!fs.existsSync(categoryDir)) continue;

  const files = fs.readdirSync(categoryDir).filter((f) => /\.(jpg|jpeg)$/i.test(f));
  const oversized = files.filter((f) => fs.statSync(path.join(categoryDir, f)).size > THRESHOLD);

  console.log(`\n${category}: ${files.length} file(s), ${oversized.length} over ${thresholdMB} MB`);

  for (const file of oversized) {
    const filePath = path.join(categoryDir, file);
    const before = fs.statSync(filePath).size;

    if (dryRun) {
      console.log(`  would optimize ${file} (${mb(before)} MB)`);
      continue;
    }

    const tempPath = `${filePath}.tmp`;
    try {
      await sharp(filePath)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(tempPath);

      fs.renameSync(tempPath, filePath);
      const after = fs.statSync(filePath).size;

      console.log(`  ${file}: ${mb(before)} MB -> ${mb(after)} MB`);
      optimized++;
      savedBytes += before - after;
    } catch (err) {
      console.error(`  failed ${file}: ${err.message}`);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  }
}

console.log(
  dryRun
    ? '\nDry run. Nothing written.'
    : `\nOptimized ${optimized} file(s), saved ${mb(savedBytes)} MB.`
);
