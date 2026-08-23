import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const contentDir = path.join(ROOT, 'src', 'content', 'photos');

async function getJpegBuffer(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (['.cr2', '.cr3', '.dng', '.arw', '.nef', '.rw2', '.orf'].includes(ext)) {
    // Binary scan for embedded JPEG (CR3/BMFF fallback)
    try {
      const rawData = fs.readFileSync(filePath);
      const jpegs = [];
      let searchFrom = 0;

      while (searchFrom < rawData.length - 2) {
        const soiIndex = rawData.indexOf(Buffer.from([0xFF, 0xD8]), searchFrom);
        if (soiIndex === -1) break;
        let eoiIndex = soiIndex + 2;
        while (eoiIndex < rawData.length - 1) {
          eoiIndex = rawData.indexOf(Buffer.from([0xFF, 0xD9]), eoiIndex);
          if (eoiIndex === -1) break;
          eoiIndex += 2; 
          const jpegCandidate = rawData.subarray(soiIndex, eoiIndex);
          if (jpegCandidate.length > 50 * 1024) {
            jpegs.push({ offset: soiIndex, length: jpegCandidate.length, buffer: jpegCandidate });
          }
          break;
        }
        if (eoiIndex === -1) break;
        searchFrom = eoiIndex;
      }
      if (jpegs.length > 0) {
        jpegs.sort((a, b) => b.length - a.length);
        return jpegs[0].buffer;
      }
    } catch (e) {
      console.warn(`   ⚠️  Binary JPEG scan failed: ${e.message}`);
    }
  }
  return fs.readFileSync(filePath);
}

async function generateDescription(filePath, category) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('   ⚠️  No GEMINI_API_KEY found in environment.');
    return null;
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const imageBuffer = await getJpegBuffer(filePath);
    if (!imageBuffer) return null;
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
    const cleaned = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn(`   ⚠️  Gemini API error: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Retrying AI Descriptions for Placeholder Photos');
  
  if (!fs.existsSync(contentDir)) {
    console.error('❌ Content directory not found.');
    process.exit(1);
  }

  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));
  let processedCount = 0;

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if it's a placeholder
    if (content.includes('title: Placeholder Title') || content.includes('description: "Placeholder description')) {
      console.log(`\n🔄 Retrying ${file}...`);
      
      const categoryMatch = content.match(/category:\s*(.*)/);
      const category = categoryMatch ? categoryMatch[1].trim() : 'photography';
      
      const originalFilenameMatch = content.match(/originalFilename:\s*"?([^"\n]+)"?/);
      const originalFilename = originalFilenameMatch ? originalFilenameMatch[1] : null;

      if (!originalFilename) {
         console.log(`   ⚠️  No originalFilename found in frontmatter, skipping.`);
         continue;
      }

      const driveBaseDir = `G:\\My Drive\\photography-portfolio`;
      const sourcePath = path.join(driveBaseDir, category, originalFilename);

      if (!fs.existsSync(sourcePath)) {
        console.log(`   ⚠️  Source image not found: ${sourcePath}`);
        continue;
      }

      console.log(`   🔍 Generating AI description...`);
      const aiData = await generateDescription(sourcePath, category);
      
      if (aiData) {
         content = content.replace(/title:\s*.*/, `title: "${aiData.title.replace(/"/g, '\\"')}"`);
         content = content.replace(/description:\s*.*/, `description: "${aiData.description.replace(/"/g, '\\"')}"`);
         // Try replacing alt text (if it exists) or just ignore if it's not present. We can assume the add-photo script didn't add it as a placeholder.
         fs.writeFileSync(filePath, content);
         console.log(`   ✅ Success! Updated ${file}`);
         processedCount++;
         
         // Respect rate limit
         console.log('   ⏳ Waiting 4.5s for rate limits...');
         await new Promise(r => setTimeout(r, 4500));
      } else {
         console.log(`   ❌ Failed to get AI description.`);
         // Stop if we hit API limit again
         break;
      }
    }
  }
  console.log(`\n🎉 Done! Processed ${processedCount} photos.`);
}

main();
