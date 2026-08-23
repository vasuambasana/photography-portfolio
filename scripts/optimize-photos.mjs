#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const photosBaseDir = path.join(ROOT, 'public', 'photos');
const driveBaseDir = `G:\\My Drive\\photography-portfolio`;

const CATEGORIES = ['nature', 'architecture', 'street', 'people', 'night'];

async function optimizeCategory(category) {
  const categoryDir = path.join(photosBaseDir, category);
  if (!fs.existsSync(categoryDir)) {
    console.log(`\n⏭️  Skipping ${category} — no folder found`);
    return;
  }

  const files = fs.readdirSync(categoryDir).filter(f => /\.(jpg|jpeg)$/i.test(f));
  console.log(`\n📁 ${category.toUpperCase()}: Found ${files.length} JPEG(s)`);

  for (const file of files) {
    const filePath = path.join(categoryDir, file);
    const stats = fs.statSync(filePath);

    if (stats.size > 2 * 1024 * 1024) {
      console.log(`  Optimizing ${file} (${(stats.size / 1024 / 1024).toFixed(1)} MB)...`);
      const tempPath = filePath + '.tmp';

      try {
        await sharp(filePath)
          .resize({ width: 2560, withoutEnlargement: true })
          .jpeg({ quality: 85, mozjpeg: true })
          .toFile(tempPath);

        fs.renameSync(tempPath, filePath);
        const newStats = fs.statSync(filePath);
        console.log(`    ✅ ${(stats.size / 1024 / 1024).toFixed(1)} MB → ${(newStats.size / 1024 / 1024).toFixed(2)} MB`);
      } catch (err) {
        console.error(`    ❌ Failed: ${err.message}`);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    } else {
      console.log(`  Skipping ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB — already small)`);
    }
  }
}

async function main() {
  console.log('🚀 Photo Optimizer — Processing all categories\n');

  for (const category of CATEGORIES) {
    await optimizeCategory(category);
  }

  console.log('\n\n🎉 All categories optimized!');
}

main();
