#!/usr/bin/env node

/**
 * locate.mjs: assign locations to photos in batches.
 *
 *   node scripts/locate.mjs list                  # shoots by date, with location status
 *   node scripts/locate.mjs list --missing        # only shoots still missing a location
 *   node scripts/locate.mjs set "Death Valley National Park, California" --dates 2023-04-21..2023-04-23
 *   node scripts/locate.mjs set "Boston, Massachusetts" --slugs steel-and-sky,harbor-rhythm
 *   node scripts/locate.mjs set "..." --dates 2024-08-31 --dry-run
 *
 * Why batches: none of the originals carry GPS (checked: 0 of 129), so location can't be
 * derived. But photos cluster into shoots by capture date, and a shoot happens in one
 * place, so one command can label a whole trip.
 *
 * Locations are facts about where you stood. Only set what you actually know.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { CONTENT_DIR } from './lib/config.mjs';

const [mode, ...rest] = process.argv.slice(2);

if (!['list', 'set', 'gps'].includes(mode)) {
  console.error('Usage: node scripts/locate.mjs <list|set|gps> [...]. See the header of this file.');
  process.exit(1);
}

const flag = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i !== -1 ? rest[i + 1] : null;
};
const has = (name) => rest.includes(`--${name}`);

function load() {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const filePath = path.join(CONTENT_DIR, file);
      const parsed = matter(fs.readFileSync(filePath, 'utf-8'));
      const raw = parsed.data.date;
      const date = raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw).slice(0, 10);
      return { slug: file.replace(/\.md$/, ''), filePath, parsed, date };
    });
}

const photos = load();

if (mode === 'list') {
  const shoots = new Map();
  for (const p of photos) {
    if (!shoots.has(p.date)) shoots.set(p.date, []);
    shoots.get(p.date).push(p);
  }

  let missing = 0;
  for (const [date, group] of [...shoots.entries()].sort()) {
    const locations = [...new Set(group.map((p) => (p.parsed.data.location || '').trim()))];
    const unset = locations.every((l) => !l);
    if (unset) missing += group.length;
    if (has('missing') && !unset) continue;

    const label = unset ? '(no location)' : locations.filter(Boolean).join(' / ');
    console.log(`${date}  ${String(group.length).padStart(3)} photo(s)  ${label}`);
    if (has('verbose')) group.forEach((p) => console.log(`        ${p.slug}`));
  }

  console.log(`\n${photos.length} photos across ${shoots.size} shoot dates; ${missing} still without a location.`);
  process.exit(0);
}

if (mode === 'gps') {
  const { requireSourceDir } = await import('./lib/config.mjs');
  const { locationFromExif } = await import('./lib/geocode.mjs');
  const sourceDir = requireSourceDir();
  const dryRun = has('dry-run');

  let found = 0;
  let noGps = 0;
  let noOriginal = 0;

  for (const { slug, filePath, parsed } of photos) {
    if ((parsed.data.location || '').trim() && !has('force')) continue;

    const { originalFilename, category } = parsed.data;
    if (!originalFilename || !category) continue;

    const original = path.join(sourceDir, category, originalFilename);
    if (!fs.existsSync(original)) {
      noOriginal++;
      continue;
    }

    const place = await locationFromExif(original);
    if (!place) {
      noGps++;
      continue;
    }

    console.log(`  ${slug}  ->  "${place}"`);
    found++;

    if (!dryRun) {
      parsed.data.location = place;
      fs.writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), 'utf-8');
    }
  }

  console.log(
    `\n${found} located from GPS, ${noGps} had no GPS, ${noOriginal} had no original on disk.`
  );
  if (found === 0 && noGps > 0) {
    console.log(
      'No GPS in any original. Turn on location tagging in the camera/phone, or assign\n' +
        'locations per shoot with: node scripts/locate.mjs set "<place>" --dates <date>'
    );
  }
  process.exit(0);
}

// --- set ---
const location = rest.find((a) => !a.startsWith('--') && rest.indexOf(a) === 0);

if (!location) {
  console.error('Missing location. Example:\n  node scripts/locate.mjs set "Death Valley National Park, California" --dates 2023-04-21..2023-04-23');
  process.exit(1);
}

const dryRun = has('dry-run');
const datesArg = flag('dates');
const slugsArg = flag('slugs');

if (!datesArg && !slugsArg) {
  console.error('Specify --dates or --slugs.');
  process.exit(1);
}

let targets = [];

if (slugsArg) {
  const wanted = new Set(slugsArg.split(',').map((s) => s.trim()).filter(Boolean));
  targets = photos.filter((p) => wanted.has(p.slug));

  for (const slug of wanted) {
    if (!photos.some((p) => p.slug === slug)) console.error(`  unknown slug: ${slug}`);
  }
}

if (datesArg) {
  const matchers = datesArg.split(',').map((s) => s.trim()).filter(Boolean);
  targets = photos.filter((p) =>
    matchers.some((m) => {
      if (m.includes('..')) {
        const [from, to] = m.split('..');
        return p.date >= from && p.date <= to;
      }
      return p.date === m;
    })
  );
}

if (targets.length === 0) {
  console.log('No photos matched.');
  process.exit(0);
}

let changed = 0;

for (const { slug, filePath, parsed, date } of targets) {
  const current = (parsed.data.location || '').trim();

  if (current === location) continue;
  if (current && !has('force')) {
    console.log(`  skip ${slug}. Already set to "${current}" (use --force to overwrite)`);
    continue;
  }

  console.log(`  ${date}  ${slug}${current ? `  "${current}" ->` : ''}  "${location}"`);

  if (!dryRun) {
    parsed.data.location = location;
    fs.writeFileSync(filePath, matter.stringify(parsed.content, parsed.data), 'utf-8');
  }
  changed++;
}

console.log(
  dryRun
    ? `\nDry run: ${changed} photo(s) would change.`
    : `\nSet location on ${changed} photo(s). Run \`npm run validate\`.`
);
