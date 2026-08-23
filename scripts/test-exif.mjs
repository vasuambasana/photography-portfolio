import fs from 'node:fs';
import path from 'node:path';

async function getJpegBuffer(filePath) {
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

async function test() {
  const file = "G:\\My Drive\\photography-portfolio\\people\\2P4A6847.CR3";
  console.log("Extracting JPEG...");
  const buf = await getJpegBuffer(file);
  console.log("Extracted buffer size:", buf.length);
  
  // Save it to a file so we can inspect it or let exifr parse it directly
  fs.writeFileSync('test.jpg', buf);
  
  try {
    const exifr = await import('exifr');
    const data = await exifr.default.parse(buf);
    console.log("Parsed EXIF:", data);
  } catch (e) {
    console.log("Error parsing EXIF from buffer:", e);
  }
  
  try {
    const exifr = await import('exifr');
    const data = await exifr.default.parse('test.jpg');
    console.log("Parsed EXIF from file:", data);
  } catch (e) {
    console.log("Error parsing EXIF from file:", e);
  }
}

test();
