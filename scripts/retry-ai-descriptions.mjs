import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const ai = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

// A robust function to determine mime type
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.heic':
      return 'image/heic';
    case '.heif':
      return 'image/heif';
    case '.cr3':
      return 'image/jpeg'; // Fallback for CR3 if we upload the extracted JPEG instead
    default:
      return 'image/jpeg';
  }
}

// Extract JPEG from CR3 if needed
async function getJpegBuffer(filePath) {
  if (!filePath.toLowerCase().endsWith('.cr3')) {
    return fs.readFileSync(filePath);
  }
  
  // Same fallback logic used in add-photo.mjs
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
  return null;
}


async function generateDescription(filePath, category) {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const prompt = `You are a professional photography curator. Describe this ${category} photograph. 
Provide a creative, engaging title and a vivid 1-2 sentence description.
Return ONLY a valid JSON object in this format:
{
  "title": "A captivating title",
  "description": "A vivid description of the scene..."
}`;

  try {
    const imageBuffer = await getJpegBuffer(filePath);
    if (!imageBuffer) {
      console.warn('   ⚠️  Could not extract image buffer for AI.');
      return null;
    }

    const mimeType = getMimeType(filePath);

    const modelsToTry = [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-3-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash'
    ];

    let lastError;
    for (const modelName of modelsToTry) {
        try {
            const ai = genAI.getGenerativeModel({ model: modelName });
            const response = await ai.generateContent([
              prompt,
              { inlineData: { data: imageBuffer.toString("base64"), mimeType } }
            ]);

            let rawText = response.response.text();
            // Clean up potential markdown formatting
            rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            
            return JSON.parse(rawText);
        } catch (error) {
            console.warn(`   ⚠️  Model ${modelName} failed: ${error.message}`);
            lastError = error;
        }
    }
    
    throw lastError; // All models failed
  } catch (error) {
    console.error('   ❌ AI Generation Error:', error.message);
    return null;
  }
}

// Find the file in the subfolders
function findOriginalFile(filename) {
  const originalPhotosDir = 'G:\\My Drive\\photography-portfolio';
  const folders = fs.readdirSync(originalPhotosDir).filter(f => fs.statSync(path.join(originalPhotosDir, f)).isDirectory());
  for (const folder of folders) {
    const filePath = path.join(originalPhotosDir, folder, filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const contentDir = path.join(process.cwd(), 'src', 'content', 'photos');
  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));

  console.log('🚀 Retrying AI Descriptions for Placeholder Photos\n');
  let processedCount = 0;

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if it has the placeholder text anywhere
    if (content.includes('Replace this placeholder')) {
      console.log(`\n🔄 Retrying ${file}...`);
      
      const categoryMatch = content.match(/category:\s*"?([^"\n]+)"?/);
      const category = categoryMatch ? categoryMatch[1].trim() : 'photography';
      
      const originalFilenameMatch = content.match(/originalFilename:\s*"?([^"\n]+)"?/);
      const originalFilename = originalFilenameMatch ? originalFilenameMatch[1] : null;

      if (!originalFilename) {
         console.log(`   ⚠️  No originalFilename found in frontmatter, skipping.`);
         continue;
      }

      const sourcePath = findOriginalFile(originalFilename);

      if (!sourcePath || !fs.existsSync(sourcePath)) {
        console.log(`   ⚠️  Source image not found for: ${originalFilename}`);
        continue;
      }

      console.log(`   🔍 Generating AI description...`);
      const aiData = await generateDescription(sourcePath, category);
      
      if (aiData) {
         content = content.replace(/title:\s*.*/, `title: "${aiData.title.replace(/"/g, '\\"')}"`);
         
         // Replace the placeholder body text
         content = content.replace(/A .* photograph\. Replace this placeholder with your own description\./, aiData.description);
         
         fs.writeFileSync(filePath, content);
         console.log(`   ✅ Success! Updated ${file}`);
         processedCount++;
         
         // Respect rate limit
         console.log('   ⏳ Waiting 4.5s for rate limits...');
         await sleep(4500);
      } else {
         console.log('   ⚠️  Failed to generate AI data. Exiting loop to prevent further errors.');
         break;
      }
    }
  }
  console.log(`\n🎉 Done! Processed ${processedCount} photos.`);
}

main();
