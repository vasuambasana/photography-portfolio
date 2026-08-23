import fs from 'node:fs';
import ExifReader from 'exifreader';

async function test() {
  const file = "G:\\My Drive\\photography-portfolio\\people\\2P4A6847.CR3";
  try {
    const tags = await ExifReader.load(file);
    console.log("Make:", tags['Make']?.description);
    console.log("Model:", tags['Model']?.description);
    console.log("Lens:", tags['LensModel']?.description);
    console.log("FocalLength:", tags['FocalLength']?.description);
    console.log("FNumber:", tags['FNumber']?.description);
    console.log("ExposureTime:", tags['ExposureTime']?.description);
    console.log("ISOSpeedRatings:", tags['ISOSpeedRatings']?.description);
    console.log("DateTimeOriginal:", tags['DateTimeOriginal']?.description);
  } catch (e) {
    console.error("Error reading CR3:", e);
  }
}
test();
