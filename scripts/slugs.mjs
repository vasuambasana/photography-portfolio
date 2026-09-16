#!/usr/bin/env node

/**
 * slugs.mjs — keep photo filenames, slugs and image filenames aligned with titles.
 *
 *   node scripts/slugs.mjs check   # report files whose slug doesn't match the title
 *   node scripts/slugs.mjs fix     # rename the markdown + image and rewrite frontmatter
 *
 * The slug is the URL (/photo/<slug>), so renaming changes live URLs. Run `check`
 * first and be deliberate about `fix` on photos that are already indexed.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { CONTENT_DIR } from './lib/config.mjs';

const mode = process.argv[2];

if (!['check', 'fix'].includes(mode)) {
  console.error('Usage: node scripts/slugs.mjs <check|fix>');
  process.exit(1);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Desired slug per file, de-duplicated with a numeric suffix. */
function plan() {
  const taken = new Map();
  const entries = [];

  for (const file of fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md')).sort()) {
    const mdPath = path.join(CONTENT_DIR, file);
    const parsed = matter(fs.readFileSync(mdPath, 'utf-8'));
    if (!parsed.data.title) continue;

    let desired = slugify(parsed.data.title);
    const count = (taken.get(desired) || 0) + 1;
    taken.set(desired, count);
    if (count > 1) desired = `${desired}-${count}`;

    entries.push({ file, mdPath, parsed, current: file.replace(/\.md$/, ''), desired });
  }

  return entries;
}

const entries = plan();
const mismatched = entries.filter((e) => e.current !== e.desired);

if (mode === 'check') {
  for (const { current, desired, parsed } of mismatched) {
    console.log(`${current}  ->  ${desired}   ("${parsed.data.title}")`);
  }
  console.log(`\n${mismatched.length} of ${entries.length} photo(s) need renaming.`);
  process.exit(0);
}

let renamed = 0;

for (const { mdPath, parsed, current, desired } of mismatched) {
  const imageRef = parsed.data.image;
  if (!imageRef) {
    console.log(`skip ${current} — no image in frontmatter`);
    continue;
  }

  // Frontmatter image paths are relative to the markdown file.
  const oldImagePath = path.resolve(CONTENT_DIR, imageRef);
  if (!fs.existsSync(oldImagePath)) {
    console.log(`skip ${current} — image not found: ${imageRef}`);
    continue;
  }

  const ext = path.extname(oldImagePath);
  const newImagePath = path.join(path.dirname(oldImagePath), `${desired}${ext}`);
  const newMdPath = path.join(CONTENT_DIR, `${desired}.md`);

  if (fs.existsSync(newMdPath) || fs.existsSync(newImagePath)) {
    console.log(`skip ${current} — ${desired} already exists`);
    continue;
  }

  try {
    fs.renameSync(oldImagePath, newImagePath);
    parsed.data.image = path
      .relative(CONTENT_DIR, newImagePath)
      .replace(/\\/g, '/');

    fs.writeFileSync(newMdPath, matter.stringify(parsed.content, parsed.data), 'utf-8');
    fs.unlinkSync(mdPath);

    console.log(`renamed ${current} -> ${desired}`);
    renamed++;
  } catch (err) {
    console.error(`error ${current}: ${err.message}`);
  }
}

console.log(`\nRenamed ${renamed} photo(s).`);
console.log(`Journal entries referencing renamed slugs will now fail the build — run: npm run validate`);
