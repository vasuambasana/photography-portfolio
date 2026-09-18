import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Minimal .env reader, real env vars always win. */
export function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...rest] = trimmed.split('=');
    const name = key?.trim();
    if (name && !process.env[name]) {
      process.env[name] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

loadEnv();

/** Web-ready photos, processed by Astro at build time. */
export const PHOTOS_DIR = path.join(ROOT, 'src', 'assets', 'photos');
/** One markdown file per photo. */
export const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'photos');
export const JOURNAL_DIR = path.join(ROOT, 'src', 'content', 'journal');

/** Where the untouched originals live. Machine-specific, so it comes from .env. */
export const SOURCE_DIR = process.env.PHOTO_SOURCE_DIR || '';

export function requireSourceDir() {
  if (!SOURCE_DIR) {
    console.error(
      'PHOTO_SOURCE_DIR is not set.\n' +
        'Add it to .env (see .env.example). It should point at the folder holding your original photos.'
    );
    process.exit(1);
  }
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`PHOTO_SOURCE_DIR does not exist: ${SOURCE_DIR}`);
    process.exit(1);
  }
  return SOURCE_DIR;
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';
export const GEMINI_MODELS = [...new Set([GEMINI_MODEL, GEMINI_FALLBACK_MODEL])];

export const VALID_CATEGORIES = [
  'architecture',
  'nature',
  'street',
  'night',
  'people',
  'portrait',
  'travel',
  'abstract',
];

/** Frontmatter path for a photo, relative to its markdown file in src/content/photos/. */
export function frontmatterImagePath(category, fileName) {
  return `../../assets/photos/${category}/${fileName}`;
}
