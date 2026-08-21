#!/usr/bin/env node

/**
 * add-photo.mjs — Streamlined photo-adding script for the photography portfolio.
 *
 * Usage:
 *   node scripts/add-photo.mjs <path-to-image-or-folder> --category <category>
 *
 * Examples:
 *   node scripts/add-photo.mjs "C:\Photos\tokyo-alley.jpg" --category night
 *   node scripts/add-photo.mjs "C:\Photos\architecture\" --category architecture
 *
 * What it does:
 *   1. Copies the image to public/photos/<category>/
 *   2. Reads EXIF data (camera, lens, focal length, aperture, shutter, ISO)
 *   3. Calls Gemini API to generate a title, alt text, and artistic description
 *   4. Creates a markdown file in src/content/photos/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Load .env if present
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...val] = trimmed.split('=');
    if (key && !process.env[key.trim()]) {
      process.env[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

// ---------------------------------------------------------------------------
// Parse CLI arguments
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return null;
}

const inputPath = args.find(a => !a.startsWith('--'));
const category = getArg('category');
const skipAI = args.includes('--skip-ai');
const featured = args.includes('--featured');

const VALID_CATEGORIES = ['architecture', 'nature', 'street', 'night', 'people', 'portrait', 'travel', 'abstract'];

if (!inputPath) {
  console.error(`
  Usage: node scripts/add-photo.mjs <path-to-image-or-folder> [--category <category>]

  Options:
    --category    Optional if path is a category folder or parent folder with category subfolders.
                  One of: ${VALID_CATEGORIES.join(', ')}
    --skip-ai     Skip Gemini API call (uses placeholder text)
    --featured    Mark the photo as featured on the homepage

  Examples:
    # Process entire Google Drive photography-portfolio folder (auto-detects categories from subfolders):
    node scripts/add-photo.mjs "G:\\My Drive\\photography-portfolio"

    # Process specific category subfolder:
    node scripts/add-photo.mjs "G:\\My Drive\\photography-portfolio\\architecture" --category architecture

    # Process single image:
    node scripts/add-photo.mjs "C:\\Photos\\my-shot.jpg" --category people
  `);
  process.exit(1);
}

import crypto from 'node:crypto';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.cr2', '.cr3', '.dng', '.arw', '.nef', '.rw2', '.orf'];
const RAW_EXTENSIONS = ['.cr2', '.cr3', '.dng', '.arw', '.nef', '.rw2', '.orf'];

// Calculate MD5 hash of a file (or first 1MB for fast checking of large files)
function getFileHash(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(1024 * 1024); // 1MB sample
    const bytesRead = fs.readSync(fd, buffer, 0, 1024 * 1024, 0);
    fs.closeSync(fd);
    return crypto.createHash('md5').update(buffer.subarray(0, bytesRead)).digest('hex');
  } catch (e) {
    return filePath;
  }
}

// ---------------------------------------------------------------------------
// Collect files to process & Deduplicate
// ---------------------------------------------------------------------------
function collectImages(inputPath) {
  const resolved = path.resolve(inputPath);

  if (!fs.existsSync(resolved)) {
    console.error(`❌ Path not found: ${resolved}`);
    process.exit(1);
  }

  let allFiles = [];

  const stat = fs.statSync(resolved);
  if (stat.isFile()) {
    allFiles = [resolved];
  } else if (stat.isDirectory()) {
    allFiles = fs.readdirSync(resolved)
      .filter(f => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
      .map(f => path.join(resolved, f))
      .sort();
  } else {
    console.error(`❌ Not a file or directory: ${resolved}`);
    process.exit(1);
  }

  // 1. Group by stem to deduplicate RAW + JPG pairs (e.g. IMG_0001.CR3 and IMG_0001.JPG)
  // and strip copy suffixes like " (1)", "_copy", "-copy"
  const stemMap = new Map();
  const seenHashes = new Set();
  const deduplicated = [];

  for (const filePath of allFiles) {
    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath, ext);

    // Normalize stem to catch all duplicate naming conventions:
    // "IMG_0001 (1)", "IMG_0001_copy", "IMG_0001 - Copy", "IMG_0001-Edit", "IMG_0001_1" -> "img_0001"
    const cleanStem = baseName
      .replace(/[\s\-_]*(copy|edit|\(\d+\)|_\d+|\-\d+)$/i, '')
      .replace(/[\s\-_]+/g, '')
      .toLowerCase();

    // Check MD5 hash deduplication (catches identical files even with different names)
    const hash = getFileHash(filePath);
    if (seenHashes.has(hash)) {
      console.log(`   ⏭️  Skipping duplicate image content: ${path.basename(filePath)}`);
      continue;
    }

    // Handle RAW vs JPG pairing and duplicate RAW / duplicate JPG with same base name
    if (stemMap.has(cleanStem)) {
      const existing = stemMap.get(cleanStem);
      const existingExt = path.extname(existing).toLowerCase();
      const existingIsRaw = RAW_EXTENSIONS.includes(existingExt);
      const currentIsRaw = RAW_EXTENSIONS.includes(ext);

      // If existing is JPG and current is RAW, upgrade to RAW
      if (!existingIsRaw && currentIsRaw) {
        console.log(`   🔄 Upgrading photo from JPG (${path.basename(existing)}) to RAW (${path.basename(filePath)})`);
        stemMap.set(cleanStem, filePath);
        seenHashes.add(hash);
      } else {
        console.log(`   ⏭️  Skipping duplicate ${currentIsRaw ? 'RAW' : 'JPG'} photo: ${path.basename(filePath)}`);
      }
      continue;
    }

    seenHashes.add(hash);
    stemMap.set(cleanStem, filePath);
  }

  return Array.from(stemMap.values());
}

// ---------------------------------------------------------------------------
// EXIF extraction
// ---------------------------------------------------------------------------
async function readExif(filePath) {
  try {
    const exifr = await import('exifr');
    const data = await exifr.default.parse(filePath, {
      pick: ['Make', 'Model', 'LensModel', 'LensMake',
             'FocalLength', 'FNumber', 'ExposureTime', 'ISO',
             'GPSLatitude', 'GPSLongitude', 'DateTimeOriginal'],
    });

    if (!data) return {};

    // Format shutter speed
    let shutterSpeed = '';
    if (data.ExposureTime) {
      shutterSpeed = data.ExposureTime < 1
        ? `1/${Math.round(1 / data.ExposureTime)}s`
        : `${data.ExposureTime}s`;
    }

    return {
      body: [data.Make, data.Model].filter(Boolean).join(' ').trim() || undefined,
      lens: data.LensModel || undefined,
      focalLength: data.FocalLength ? `${Math.round(data.FocalLength)}mm` : undefined,
      aperture: data.FNumber ? `f/${data.FNumber}` : undefined,
      shutterSpeed: shutterSpeed || undefined,
      iso: data.ISO ? String(data.ISO) : undefined,
      dateTaken: data.DateTimeOriginal || undefined,
    };
  } catch (e) {
    console.warn(`   ⚠️  Could not read EXIF: ${e.message}`);
    return {};
  }
}

const RAW_EXTENSIONS = ['.cr2', '.cr3', '.dng', '.arw', '.nef', '.rw2', '.orf'];

async function getJpegBuffer(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (RAW_EXTENSIONS.includes(ext)) {
    try {
      const exifr = await import('exifr');
      const thumb = await exifr.default.thumbnail(filePath);
      if (thumb) return Buffer.from(thumb);
    } catch (e) {
      console.warn(`   ⚠️  Could not extract JPEG preview from RAW: ${e.message}`);
    }
  }
  return fs.readFileSync(filePath);
}

async function generateDescription(filePath, category) {
  if (quotaExceeded) {
    console.warn('   ⚠️  Daily free quota reached. Falling back to placeholder title/description for remaining photos.');
    return null;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('   ⚠️  No GEMINI_API_KEY found in environment. Using placeholder text.');
    return null;
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const imageBuffer = await getJpegBuffer(filePath);
    const base64 = imageBuffer.toString('base64');
    const mimeType = 'image/jpeg';

    const prompt = `You are a professional photography curator writing for a photographer's portfolio website.

Analyze this ${category} photograph and provide:
1. A short, evocative title (2-4 words, no quotes)
2. A concise alt text description for accessibility (one sentence)
3. A 2-3 sentence artistic description from the photographer's perspective — describe what drew them to the shot, the lighting, the mood, or a small story behind it. Write in first person. Keep it genuine and understated, not flowery.

Respond in this exact JSON format, no markdown:
{"title": "...", "alt": "...", "description": "..."}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType } },
    ]);

    const text = result.response.text().trim();
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    if (e.message?.includes('429') || e.message?.toLowerCase().includes('quota') || e.message?.toLowerCase().includes('rate limit')) {
      console.warn('   🛑 Free tier rate/daily limit reached! Switching to placeholder mode for safety.');
      quotaExceeded = true;
      return null;
    }
    console.warn(`   ⚠️  Gemini API error: ${e.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------
function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ---------------------------------------------------------------------------
// Determine the next order number for a category
// ---------------------------------------------------------------------------
function getNextOrder(category) {
  const photosDir = path.join(ROOT, 'src', 'content', 'photos');
  if (!fs.existsSync(photosDir)) return 1;

  let maxOrder = 0;
  for (const file of fs.readdirSync(photosDir)) {
    if (!file.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(photosDir, file), 'utf-8');
    const catMatch = content.match(/^category:\s*"?(\w+)"?/m);
    const orderMatch = content.match(/^order:\s*(\d+)/m);
    if (catMatch && catMatch[1] === category && orderMatch) {
      maxOrder = Math.max(maxOrder, parseInt(orderMatch[1], 10));
    }
  }
  return maxOrder + 1;
}

// ---------------------------------------------------------------------------
// Process a single image
// ---------------------------------------------------------------------------
async function processImage(filePath, targetCategory, orderStart) {
  const ext = path.extname(filePath).toLowerCase();
  const originalName = path.basename(filePath, ext);
  const isRaw = RAW_EXTENSIONS.includes(ext);
  const rawSlug = toSlug(originalName);

  // Check if photo is already imported
  const existingMd = path.join(ROOT, 'src', 'content', 'photos', `${rawSlug}.md`);
  if (fs.existsSync(existingMd)) {
    console.log(`\n⏭️  Skipping [already imported]: ${path.basename(filePath)}`);
    return rawSlug;
  }

  console.log(`\n📸 Processing [${targetCategory}]${isRaw ? ' (RAW format)' : ''}: ${path.basename(filePath)}`);

  // 1. Read EXIF
  console.log('   🔍 Reading EXIF data...');
  const exif = await readExif(filePath);
  if (exif.body) console.log(`      Camera: ${exif.body}`);
  if (exif.lens) console.log(`      Lens: ${exif.lens}`);
  if (exif.focalLength) console.log(`      Focal: ${exif.focalLength}  f/${exif.aperture?.replace('f/', '')}  ${exif.shutterSpeed}  ISO ${exif.iso}`);

  // 2. Generate AI description (or use placeholder)
  let aiData = null;
  if (!skipAI) {
    console.log('   🤖 Generating AI description...');
    aiData = await generateDescription(filePath, targetCategory);
    if (aiData) {
      console.log(`      Title: "${aiData.title}"`);
      console.log(`      Description: "${aiData.description.substring(0, 80)}..."`);
    }
  }

  const title = aiData?.title || originalName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const alt = aiData?.alt || `A ${targetCategory} photograph`;
  const description = aiData?.description || `A ${targetCategory} photograph. Replace this placeholder with your own description.`;

  // 3. Save web image to public/photos/<targetCategory>/
  const slug = toSlug(title);
  const outputExt = isRaw ? '.jpg' : ext;
  const destFileName = `${slug}${outputExt}`;
  const destDir = path.join(ROOT, 'public', 'photos', targetCategory);
  const destPath = path.join(destDir, destFileName);

  fs.mkdirSync(destDir, { recursive: true });

  if (isRaw) {
    const jpegBuf = await getJpegBuffer(filePath);
    fs.writeFileSync(destPath, jpegBuf);
    console.log(`   🖼️  Extracted & saved JPEG to: public/photos/${targetCategory}/${destFileName}`);
  } else {
    fs.copyFileSync(filePath, destPath);
    console.log(`   📁 Copied to: public/photos/${targetCategory}/${destFileName}`);
  }

  // 4. Determine date
  const photoDate = exif.dateTaken
    ? new Date(exif.dateTaken).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  // 5. Build camera specs YAML
  const specEntries = [];
  if (exif.body) specEntries.push(`  body: "${exif.body}"`);
  if (exif.lens) specEntries.push(`  lens: "${exif.lens}"`);
  if (exif.focalLength) specEntries.push(`  focalLength: "${exif.focalLength}"`);
  if (exif.aperture) specEntries.push(`  aperture: "${exif.aperture}"`);
  if (exif.shutterSpeed) specEntries.push(`  shutterSpeed: "${exif.shutterSpeed}"`);
  if (exif.iso) specEntries.push(`  iso: "${exif.iso}"`);

  const cameraBlock = specEntries.length > 0
    ? `cameraSpecs:\n${specEntries.join('\n')}`
    : '';

  // 6. Write markdown file
  const mdContent = `---
title: "${title}"
category: "${targetCategory}"
image: "/photos/${targetCategory}/${destFileName}"
alt: "${alt}"
date: ${photoDate}
location: ""
featured: ${featured}
order: ${orderStart}
${cameraBlock}
---

${description}
`;

  const mdPath = path.join(ROOT, 'src', 'content', 'photos', `${slug}.md`);
  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  console.log(`   📝 Created: src/content/photos/${slug}.md`);

  return slug;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`❌ Path not found: ${resolvedInput}`);
    process.exit(1);
  }

  const stat = fs.statSync(resolvedInput);
  let tasks = [];

  if (stat.isDirectory()) {
    const folderName = path.basename(resolvedInput).toLowerCase();
    
    // Check if the input directory itself is a category folder
    if (VALID_CATEGORIES.includes(folderName)) {
      const cat = category || folderName;
      const images = collectImages(resolvedInput);
      images.forEach(img => tasks.push({ img, cat }));
    } else {
      // Check subfolders for category names
      const subdirs = fs.readdirSync(resolvedInput)
        .filter(f => fs.statSync(path.join(resolvedInput, f)).isDirectory());

      for (const sub of subdirs) {
        const subName = sub.toLowerCase();
        if (VALID_CATEGORIES.includes(subName)) {
          const cat = subName;
          const images = collectImages(path.join(resolvedInput, sub));
          images.forEach(img => tasks.push({ img, cat }));
        }
      }

      // Fallback if no category subfolders matched, but photos exist in current folder
      if (tasks.length === 0 && category) {
        const images = collectImages(resolvedInput);
        images.forEach(img => tasks.push({ img, cat: category }));
      }
    }
  } else if (stat.isFile()) {
    const cat = category || 'architecture';
    tasks.push({ img: resolvedInput, cat });
  }

  if (tasks.length === 0) {
    console.error(`❌ No photos found to process in "${resolvedInput}". Ensure subfolders are named after categories: ${VALID_CATEGORIES.join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🚀 Photography Portfolio Importer`);
  console.log(`Found ${tasks.length} photo(s) across categories.`);
  console.log('─'.repeat(50));

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));
  const processedSlugs = [];

  for (let i = 0; i < tasks.length; i++) {
    const { img, cat } = tasks[i];
    const order = getNextOrder(cat);
    const slug = await processImage(img, cat, order);
    processedSlugs.push(slug);

    // Wait 4.2s between photos to stay within Gemini Free Tier rate limits
    if (i < tasks.length - 1 && !skipAI && !quotaExceeded) {
      console.log('   ⏳ Waiting 4s to stay within Gemini Free Tier rate limits...');
      await sleep(4200);
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Done! Added ${processedSlugs.length} photo(s).`);
  console.log('\nNext steps:');
  console.log('  1. Review markdown files in src/content/photos/');
  console.log('  2. Commit and push:');
  console.log('     git add .');
  console.log('     git commit -m "Add new photos"');
  console.log('     git push');
}

main().catch(e => {
  console.error('❌ Fatal error:', e);
  process.exit(1);
});
