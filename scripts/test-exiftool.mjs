import { exiftool } from 'exiftool-vendored';

async function test() {
  const file = "G:\\My Drive\\photography-portfolio\\people\\2P4A6847.CR3";
  try {
    const tags = await exiftool.read(file);
    console.log("Make:", tags.Make);
    console.log("Model:", tags.Model);
    console.log("Lens:", tags.LensModel);
    console.log("FocalLength:", tags.FocalLength);
    console.log("FNumber:", tags.FNumber);
    console.log("ExposureTime:", tags.ExposureTime);
    console.log("ISO:", tags.ISO);
    console.log("DateTimeOriginal:", tags.DateTimeOriginal);
  } catch (e) {
    console.error("Error reading CR3:", e);
  } finally {
    exiftool.end();
  }
}
test();
