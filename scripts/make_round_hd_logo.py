import os
from PIL import Image, ImageDraw

def make_round_hd_logo():
    img_path = "public/logo.png"
    img = Image.open(img_path).convert("RGBA")
    
    # Upscale to high-definition
    width, height = img.size
    max_dim = max(width, height)
    scale = 2048 / max_dim
    new_width = int(width * scale)
    new_height = int(height * scale)
    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Pad to square
    sq_size = max(new_width, new_height)
    padding = int(sq_size * 0.1)
    padded_size = sq_size + padding * 2
    
    square = Image.new("RGBA", (padded_size, padded_size), (0, 0, 0, 0))
    square.paste(img, ((padded_size - new_width) // 2, (padded_size - new_height) // 2))
    
    # Create circular mask
    mask = Image.new("L", (padded_size, padded_size), 0)
    draw = ImageDraw.Draw(mask)
    # Anti-aliased circle by drawing larger and shrinking, or just use regular ellipse
    draw.ellipse((0, 0, padded_size, padded_size), fill=255)
    
    # Create background with the theme's color
    # Let's check tailwind config for background color, maybe #0a0a0a for dark mode, or #F4EFE9
    # The previous script used (244, 239, 233) for the background before making transparent.
    # Let's just make the circle background dark like the site (#09090b - zinc-950) or white.
    # Actually, let's use the site's accent or dark color. Let's do a dark circle.
    bg = Image.new("RGBA", (padded_size, padded_size), (9, 9, 11, 255))
    bg.putalpha(mask)
    
    # Composite the logo onto the circular background
    final = Image.alpha_composite(bg, square)
    
    # Save the output to artifacts
    out_dir = r"C:\Users\vasu1\.gemini\antigravity-ide\brain\a863f8e2-02b5-4ecf-898c-9a42c7df6b73"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "logo_round_hd.png")
    final.save(out_path)
    print(f"Saved {out_path}")
    
    # Let's also save a version with a transparent background but circular crop
    transparent_bg = Image.new("RGBA", (padded_size, padded_size), (0, 0, 0, 0))
    transparent_bg.paste(square, (0, 0), mask=mask)
    out_path2 = os.path.join(out_dir, "logo_round_hd_transparent.png")
    transparent_bg.save(out_path2)
    print(f"Saved {out_path2}")

if __name__ == "__main__":
    make_round_hd_logo()
