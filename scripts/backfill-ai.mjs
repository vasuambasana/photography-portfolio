#!/usr/bin/env node

/**
 * backfill-ai.mjs — regenerate alt text and descriptions that were left as
 * placeholders when the Gemini call failed or hit quota during ingest.
 *
 *   node scripts/backfill-ai.mjs            # fix everything that looks like a placeholder
 *   node scripts/backfill-ai.mjs --alt-only # leave descriptions alone
 *   node scripts/backfill-ai.mjs --limit 20 # stop after 20 photos (quota control)
 *   node scripts/backfill-ai.mjs --dry-run  # list what would change, call nothing
 *
 * Reads the web-sized JPEG from src/assets/photos, so it does not need the originals.
 * `npm run validate` reports how many photos still need this.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONTENT_DIR, GEMINI_MODELS } from './lib/config.mjs';

const args = process.argv.slice(2);
const altOnly = args.includes('--alt-only');
const dryRun = args.includes('--dry-run');
const limitArg = args.indexOf('--limit');
const limit = limitArg !== -1 ? Number(args[limitArg + 1]) : Infinity;

const PLACEHOLDER_ALT = /^an? \w+ photograph\.?$/i;
const PLACEHOLDER_BODY = /Replace this placeholder with your own description/i;

const RATE_LIMIT_MS = 4500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const prompt = (category) => `You are a professional photography curator writing for a photographer's portfolio website.

Analyze this ${category} photograph and provide:
1. A short, evocative title (2-4 words, no quotes)
2. A concise alt text description for accessibility — one sentence that describes what is
   actually visible in the frame, for someone who cannot see it. Be specific and concrete.
3. A 2-3 sentence artistic description from the photographer's perspective — what drew them
   to the shot, the lighting, the mood, or a small story behind it. First person. Genuine
   and understated, not flowery.

Respond in this exact JSON format, no markdown:
{"title": "...", "alt": "...", "description": "..."}`;

async function generate(genAI, imagePath, category) {
  const base64 = fs.readFileSync(imagePath).toString('base64');

  let lastError;
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent([
        prompt(category),
        { inlineData: { data: base64, mimeType: 'image/jpeg' } },
      ]);

      const raw = response.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`   model ${modelName} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------

const candidates = [];

for (const file of fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md')).sort()) {
  const filePath = path.join(CONTENT_DIR, file);
  const parsed = matter(fs.readFileSync(filePath, 'utf-8'));

  const needsAlt = PLACEHOLDER_ALT.test((parsed.data.alt || '').trim());
  const needsBody = !altOnly && PLACEHOLDER_BODY.test(parsed.content);

  if (needsAlt || needsBody) {
    candidates.push({ file, filePath, parsed, needsAlt, needsBody });
  }
}

console.log(`${candidates.length} photo(s) need backfilling.`);

if (dryRun) {
  for (const { file, needsAlt, needsBody } of candidates) {
    console.log(`  ${file} — ${[needsAlt && 'alt', needsBody && 'description'].filter(Boolean).join(' + ')}`);
  }
  process.exit(0);
}

if (candidates.length === 0) process.exit(0);

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set — add it to .env (see .env.example).');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const targets = candidates.slice(0, limit);
let updated = 0;

for (const [i, { file, filePath, parsed, needsAlt, needsBody }] of targets.entries()) {
  const { data } = parsed;
  console.log(`\n[${i + 1}/${targets.length}] ${file}`);

  const imagePath = path.resolve(CONTENT_DIR, data.image || '');
  if (!data.image || !fs.existsSync(imagePath)) {
    console.log('   skip — image not found on disk');
    continue;
  }

  let ai;
  try {
    ai = await generate(genAI, imagePath, data.category || 'photography');
  } catch (err) {
    console.error(`   stopping — all models failed: ${err.message}`);
    break;
  }

  if (needsAlt && ai.alt) data.alt = ai.alt;

  let body = parsed.content;
  if (needsBody && ai.description) {
    body = `\n${ai.description}\n`;
  }

  fs.writeFileSync(filePath, matter.stringify(body, data), 'utf-8');
  console.log(`   updated${needsAlt ? ' alt' : ''}${needsBody ? ' description' : ''}`);
  updated++;

  if (i < targets.length - 1) await sleep(RATE_LIMIT_MS);
}

console.log(`\nUpdated ${updated} photo(s). Run \`npm run validate\` to see what's left.`);
