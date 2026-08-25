import fs from 'node:fs';
import path from 'node:path';
import { exiftool } from 'exiftool-vendored';

const photosDir = path.join(process.cwd(), 'src', 'content', 'photos');
const originalPhotosDir = 'G:\\My Drive\\photography-portfolio';

// Find the file in the subfolders
function findOriginalFile(filename) {
  const folders = fs.readdirSync(originalPhotosDir).filter(f => fs.statSync(path.join(originalPhotosDir, f)).isDirectory());
  for (const folder of folders) {
    const filePath = path.join(originalPhotosDir, folder, filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

// Convert fractional string like "1/1000" or raw number to fraction
function formatExposureTime(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value > 0 && value < 1) {
    return `1/${Math.round(1 / value)}`;
  }
  return String(value);
}

function formatFocalLength(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.replace(/ mm$/, '');
  return String(value);
}

async function run() {
  const files = fs.readdirSync(photosDir).filter(f => f.endsWith('.md'));
  let updatedCount = 0;

  for (const file of files) {
    const mdPath = path.join(photosDir, file);
    let content = fs.readFileSync(mdPath, 'utf-8');
    
    const isMissingCameraSpecs = !content.includes('cameraSpecs:');
    const isMissingBody = content.match(/cameraSpecs:\s*\n((?:  .*\n)*)/) ? !content.match(/cameraSpecs:\s*\n((?:  .*\n)*)/)[1].includes('body:') : false;
    
    if (isMissingCameraSpecs || isMissingBody) {
      console.log(`Processing missing EXIF for: ${file}`);
      
      const originalFilenameMatch = content.match(/originalFilename:\s*"([^"]+)"/);
      if (!originalFilenameMatch) {
        console.log(`- originalFilename not found in ${file}`);
        continue;
      }
      const originalFilename = originalFilenameMatch[1];
      const sourceFile = findOriginalFile(originalFilename);
      
      if (!sourceFile) {
        console.log(`- Source file not found for ${originalFilename}`);
        continue;
      }
      
      try {
        const tags = await exiftool.read(sourceFile);
        const cameraSpecs = {
          body: tags.Make && tags.Model ? `${tags.Make} ${tags.Model}` : (tags.Model || 'Unknown Body'),
          lens: tags.LensModel || 'Unknown Lens',
          settings: [
            tags.FocalLength ? `${formatFocalLength(tags.FocalLength)}mm` : 'Unknown mm',
            tags.FNumber ? `f/${tags.FNumber}` : 'Unknown f/',
            tags.ExposureTime ? `${formatExposureTime(tags.ExposureTime)}s` : 'Unknown s',
            tags.ISO ? `ISO ${tags.ISO}` : 'Unknown ISO'
          ].join(' | ')
        };
        
        let newCameraSpecsStr = `cameraSpecs:\n  body: "${cameraSpecs.body}"\n  lens: "${cameraSpecs.lens}"\n  settings: "${cameraSpecs.settings}"\n`;
        
        if (isMissingCameraSpecs) {
          // insert it before the closing '---' of the frontmatter
          const lastDashIdx = content.indexOf('\n---');
          if (lastDashIdx !== -1) {
            content = content.substring(0, lastDashIdx) + `\n${newCameraSpecsStr}` + content.substring(lastDashIdx);
          }
        } else if (isMissingBody) {
          // replace the existing malformed cameraSpecs block
          content = content.replace(/cameraSpecs:[\s\S]*?(?=\n\w|$)/, newCameraSpecsStr.trimEnd());
        }
        
        fs.writeFileSync(mdPath, content, 'utf-8');
        console.log(`- Updated ${file}`);
        updatedCount++;
      } catch (err) {
        console.error(`- Error reading EXIF for ${sourceFile}:`, err);
      }
    }
  }

  await exiftool.end();
  console.log(`\nFinished! Updated ${updatedCount} files.`);
}

run();
