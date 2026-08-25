import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const dir = path.join(process.cwd(), 'src/content/photos');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
const map = new Map();
let needsRenameCount = 0;

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf-8');
  const parsed = matter(content);
  const title = parsed.data.title;
  
  if (title) {
    const newName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const currentName = file.replace('.md', '');
    
    if (currentName !== newName) {
      needsRenameCount++;
      if (map.has(newName)) {
        map.set(newName, map.get(newName) + 1);
        console.log(`DUPLICATE TITLE: "${title}" -> ${newName} (current: ${currentName})`);
      } else {
        map.set(newName, 1);
      }
    }
  }
}
console.log('Files needing rename:', needsRenameCount);
