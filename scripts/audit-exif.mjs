import fs from 'node:fs';
import path from 'node:path';

const photosDir = path.join(process.cwd(), 'src', 'content', 'photos');
const files = fs.readdirSync(photosDir).filter(f => f.endsWith('.md'));

let missingCount = 0;

console.log('Auditing EXIF data...');
for (const file of files) {
  const content = fs.readFileSync(path.join(photosDir, file), 'utf-8');
  if (!content.includes('cameraSpecs:')) {
    console.log(`- Missing cameraSpecs: ${file}`);
    missingCount++;
  } else {
    // Check if body is missing inside cameraSpecs
    const match = content.match(/cameraSpecs:\s*\n((?:  .*\n)*)/);
    if (match) {
       const specs = match[1];
       if (!specs.includes('body:')) {
          console.log(`- Missing body in cameraSpecs: ${file}`);
          missingCount++;
       }
    } else {
       // Single line cameraSpecs (if any)
       console.log(`- Malformed cameraSpecs: ${file}`);
       missingCount++;
    }
  }
}

console.log(`\nAudit complete. ${missingCount} files have missing or incomplete EXIF data.`);
