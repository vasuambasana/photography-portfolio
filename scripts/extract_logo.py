import sys
import os
from PIL import Image

def process_logo(img_path):
    print(f"Processing {img_path}...")
    img = Image.open(img_path).convert("RGBA")
    width, height = img.size
    print(f"Original size: {width}x{height}")
    
    # 1. Main Logo: Left side of the image (roughly first 40% of width)
    # The logo has some text below it. Let's crop generously and find bbox.
    main_crop = img.crop((0, 0, int(width * 0.45), height))
    
    # Remove background #f4efe9 (244, 239, 233)
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
        main_logo = main_crop.crop(bbox)
        # We don't want the text "1200px (for website...)" which is at the bottom.
        # The actual logo and "VA PHOTOGRAPHY" is at the top. 
        # The text is far below. Let's crop out the bottom 20% of the bounding box if it's there.
        # Or even better, crop only the top 70% of the bounding box before finding bbox again.
        clean_logo_crop = main_logo.crop((0, 0, main_logo.width, int(main_logo.height * 0.8)))
        clean_bbox = clean_logo_crop.getbbox()
        if clean_bbox:
            final_main_logo = clean_logo_crop.crop(clean_bbox)
            final_main_logo.save(os.path.join("public", "logo.png"))
            print(f"Saved public/logo.png {final_main_logo.size}")
            
            # For Favicon, let's use the same logo but squarified (without the "PHOTOGRAPHY" text ideally, 
            # but we can just use the whole thing for now, or just crop the circle and VA)
            # The circle is at the very top. Let's crop the top 75% for the favicon.
            fav_crop = final_main_logo.crop((0, 0, final_main_logo.width, int(final_main_logo.height * 0.75)))
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
