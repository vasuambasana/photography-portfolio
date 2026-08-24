import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { exiftool } from 'exiftool-vendored';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

async function fixExif() {
  const photosDir = path.join(ROOT, 'src', 'content', 'photos');
  const driveBaseDir = 'G:\\My Drive\\photography-portfolio';
  
  const files = fs.readdirSync(photosDir).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} markdown files. Scanning for missing EXIF...`);
  
  let updatedCount = 0;

  for (const file of files) {
    const filePath = path.join(photosDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(content);
    const data = parsed.data;
    
    if (!data.originalFilename || !data.category) {
      console.log(`Skipping ${file}: Missing originalFilename or category.`);
      continue;
    }
    
    // Check if cameraSpecs is mostly complete
    // Some might only have 'body' if it was parsed poorly. We will just re-parse all of them to be safe
    // and merge it in.
    const originalPath = path.join(driveBaseDir, data.category, data.originalFilename);
    
    if (!fs.existsSync(originalPath)) {
      console.log(`Missing original for ${data.originalFilename} at ${originalPath}`);
      continue;
    }
    
    try {
      const tags = await exiftool.read(originalPath);
      
      const newSpecs = {};
      
      let make = tags.Make ? tags.Make.trim() : '';
      let model = tags.Model ? tags.Model.trim() : '';
      let body = '';
      if (make && model) {
        if (model.toLowerCase().startsWith(make.toLowerCase())) {
          body = model;
        } else {
          body = `${make} ${model}`;
        }
      } else {
        body = model || make || undefined;
      }
      if (body) newSpecs.body = body;
      
      let lens = tags.LensModel || tags.Lens || undefined;
      if (lens) newSpecs.lens = lens;
      
      if (tags.FocalLengthIn35mmFormat) {
          newSpecs.focalLength = `${tags.FocalLengthIn35mmFormat.replace(/ ?mm$/, '')}mm (35mm eq)`;
      } else if (tags.FocalLength) {
          newSpecs.focalLength = `${tags.FocalLength.replace(/ ?mm$/, '')}mm`;
      }
      
      if (tags.FNumber) {
          newSpecs.aperture = `f/${tags.FNumber}`;
      } else if (tags.Aperture) {
          newSpecs.aperture = `f/${tags.Aperture}`;
      }
      
      if (tags.ExposureTime) {
          newSpecs.shutterSpeed = tags.ExposureTime < 1 
            ? `1/${Math.round(1 / tags.ExposureTime)}s` 
            : `${tags.ExposureTime}s`;
      } else if (tags.ShutterSpeed) {
          newSpecs.shutterSpeed = tags.ShutterSpeed;
      }
      
      if (tags.ISO) {
          newSpecs.iso = String(tags.ISO);
      }
      
      if (Object.keys(newSpecs).length > 0) {
          let merged = { ...data.cameraSpecs, ...newSpecs };
          
          // Only update if there's an actual change to prevent unnecessary writes
          if (JSON.stringify(data.cameraSpecs) !== JSON.stringify(merged)) {
              data.cameraSpecs = merged;
              const updatedContent = matter.stringify(parsed.content, data);
              fs.writeFileSync(filePath, updatedContent, 'utf-8');
              console.log(`Updated EXIF for ${file}`);
              updatedCount++;
          }
      }
    } catch(e) {
      console.error(`Error processing ${file}: ${e.message}`);
    }
  }
  
  await exiftool.end();
  console.log(`\nFinished! Updated ${updatedCount} files.`);
}

fixExif().catch(console.error);
