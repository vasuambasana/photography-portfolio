import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const photosDir = path.join(process.cwd(), 'src/content/photos');
const publicDir = path.join(process.cwd(), 'public');

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function run() {
  const files = fs.readdirSync(photosDir).filter(f => f.endsWith('.md'));
  const nameMap = new Map();
  let renamedCount = 0;

  for (const file of files) {
    const mdPath = path.join(photosDir, file);
    const content = fs.readFileSync(mdPath, 'utf-8');
    const parsed = matter(content);
    const data = parsed.data;

    if (!data.title) continue;

    let baseName = slugify(data.title);
    if (nameMap.has(baseName)) {
      nameMap.set(baseName, nameMap.get(baseName) + 1);
      baseName = `${baseName}-${nameMap.get(baseName)}`;
    } else {
      nameMap.set(baseName, 1);
    }

    const currentName = file.replace('.md', '');
    
    // Check if it's already named correctly
    if (currentName === baseName) {
      continue;
    }

    let imagePath = data.image; // e.g. /photos/architecture/2p4a4161.jpg
    if (!imagePath) continue;

    const oldImageFullPath = path.join(publicDir, imagePath);
    
    if (!fs.existsSync(oldImageFullPath)) {
      console.log(`Warning: Image file not found for ${file} at ${oldImageFullPath}`);
      continue;
    }

    const ext = path.extname(imagePath);
    const imageDir = path.dirname(imagePath); // e.g. /photos/architecture
    
    const newImagePath = `${imageDir}/${baseName}${ext}`.replace(/\\/g, '/');
    const newImageFullPath = path.join(publicDir, newImagePath);
    
    const newMdPath = path.join(photosDir, `${baseName}.md`);

    try {
      // 1. Rename the image
      fs.renameSync(oldImageFullPath, newImageFullPath);
      
      // 2. Update the frontmatter
      data.image = newImagePath;
      const updatedContent = matter.stringify(parsed.content, data);
      
      // 3. Write to new markdown file
      fs.writeFileSync(newMdPath, updatedContent, 'utf-8');
      
      // 4. Delete old markdown file
      fs.unlinkSync(mdPath);
      
      console.log(`Renamed: ${currentName} -> ${baseName}`);
      renamedCount++;
    } catch (e) {
      console.error(`Error processing ${file}: ${e.message}`);
    }
  }

  console.log(`\nFinished! Renamed ${renamedCount} files.`);
}

run();
