#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const photosDir = path.join(ROOT, 'public', 'photos', 'nature');
const driveDir = `G:\\My Drive\\photography-portfolio\\nature`;

async function optimizeImages() {
  fs.mkdirSync(photosDir, { recursive: true });

  // 1. Process 2P4A5149 if missing in public folder
  const missing5149 = path.join(photosDir, '2p4a5149.jpg');
  if (!fs.existsSync(missing5149)) {
    const src5149 = path.join(driveDir, '2P4A5149.jpg');
    if (fs.existsSync(src5149)) {
      console.log(`Processing missing photo: 2P4A5149.jpg from Google Drive...`);
      await sharp(src5149)
        .resize({ width: 2560, withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(missing5149);
      console.log(`  ✅ Successfully created ${missing5149}`);
    }
  }

  // 2. Optimize any oversized images in public/photos/nature
  const files = fs.readdirSync(photosDir).filter(f => /\.(jpg|jpeg)$/i.test(f));

  console.log(`Found ${files.length} JPEG(s) in public/photos/nature/\n`);

  for (const file of files) {
    const filePath = path.join(photosDir, file);
    const stats = fs.statSync(filePath);

    // Only process if larger than 2MB
    if (stats.size > 2 * 1024 * 1024) {
      console.log(`Optimizing ${file} (${(stats.size / 1024 / 1024).toFixed(1)} MB)...`);
      const tempPath = filePath + '.tmp';

      try {
        await sharp(filePath)
          .resize({ width: 2560, withoutEnlargement: true })
          .jpeg({ quality: 85, mozjpeg: true })
          .toFile(tempPath);

        fs.renameSync(tempPath, filePath);
        const newStats = fs.statSync(filePath);
        console.log(`  ✅ ${(stats.size / 1024 / 1024).toFixed(1)} MB → ${(newStats.size / 1024 / 1024).toFixed(2)} MB`);
      } catch (err) {
        console.error(`  ❌ Failed: ${err.message}`);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    } else {
      console.log(`Skipping ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB — already small)`);
    }
  }
}

optimizeImages().then(() => console.log('\n🎉 All done!'));
