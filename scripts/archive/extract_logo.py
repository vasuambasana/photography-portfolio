import sys
import os
from PIL import Image

def process_logo(img_path):
    print(f"Processing {img_path}...")
    img = Image.open(img_path).convert("RGBA")
    width, height = img.size
    
    # 1. Main Logo: Top-Left quadrant, much stricter crop
    # Crop to the top 60% and left 35% to avoid the "1" and "1200px" text
    main_crop = img.crop((0, 0, int(width * 0.35), int(height * 0.6)))
    
    bg = (244, 239, 233)
    def make_transparent(cropped):
        pixels = cropped.load()
        cw, ch = cropped.size
        for y in range(ch):
            for x in range(cw):
                r, g, b, a = pixels[x, y]
                dist = sum(abs(a - b) for a, b in zip((r, g, b), bg))
                if dist < 15:
                    pixels[x, y] = (r, g, b, 0)
                elif dist < 50:
                    alpha = int((dist - 15) / (50 - 15) * 255)
                    pixels[x, y] = (r, g, b, alpha)
        return cropped

    main_crop = make_transparent(main_crop)
    bbox = main_crop.getbbox()
    if bbox:
        # Crop exactly to the bounds of the logo
        final_main_logo = main_crop.crop(bbox)
        final_main_logo.save(os.path.join("public", "logo.png"))
        print(f"Saved public/logo.png {final_main_logo.size}")
        
        # For Favicon, crop the top part (the circle) and maybe VA
        # The circle is about the top 65% of the logo's height
        fav_crop = final_main_logo.crop((0, 0, final_main_logo.width, int(final_main_logo.height * 0.65)))
        fav_bbox = fav_crop.getbbox()
        if fav_bbox:
            favicon = fav_crop.crop(fav_bbox).resize((256, int(256 * (fav_bbox[3]-fav_bbox[1]) / (fav_bbox[2]-fav_bbox[0]))), Image.Resampling.LANCZOS)
            sq_size = max(favicon.size)
            sq_img = Image.new("RGBA", (sq_size, sq_size), (0, 0, 0, 0))
            sq_img.paste(favicon, ((sq_size - favicon.size[0]) // 2, (sq_size - favicon.size[1]) // 2))
            sq_img.save(os.path.join("public", "favicon.png"))
            print(f"Saved public/favicon.png {sq_img.size}")
            
    else:
        print("Could not find logo in cropped area")

if __name__ == "__main__":
    process_logo(sys.argv[1])
