import os
from PIL import Image

def enlarge_text(img_path):
    print(f"Processing {img_path}...")
    img = Image.open(img_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    
    # 1. Find the horizontal gap between "VA" and "PHOTOGRAPHY"
    # The text "PHOTOGRAPHY" is at the bottom.
    # Let's scan from bottom (height-1) upwards.
    # First, skip the empty space at the very bottom (if any)
    # Then we hit the text. Then we hit an empty gap.
    
    row_has_pixels = []
    for y in range(height):
        has_pixel = False
        for x in range(width):
            if pixels[x, y][3] > 10:  # non-transparent
                has_pixel = True
                break
        row_has_pixels.append(has_pixel)
        
    # Find the gap
    # Start from bottom, find first row with pixels (text bottom)
    bottom_text_y = height - 1
    while bottom_text_y > 0 and not row_has_pixels[bottom_text_y]:
        bottom_text_y -= 1
        
    # Now go up until we find an empty row (gap between text and 'VA')
    gap_y = bottom_text_y
    while gap_y > 0 and row_has_pixels[gap_y]:
        gap_y -= 1
        
    # Just to be safe, find the middle of the gap
    top_of_gap = gap_y
    while top_of_gap > 0 and not row_has_pixels[top_of_gap]:
        top_of_gap -= 1
        
    split_y = (gap_y + top_of_gap) // 2
    
    print(f"Split point found at y={split_y}")
    
    # Slice image
    top_part = img.crop((0, 0, width, split_y))
    bottom_part = img.crop((0, split_y, width, height))
    
    # Enlarge the bottom part (PHOTOGRAPHY text)
    # Let's make it 100% wider and taller
    scale_factor = 2.0
    new_bottom_width = int(bottom_part.width * scale_factor)
    new_bottom_height = int(bottom_part.height * scale_factor)
    
    enlarged_bottom = bottom_part.resize((new_bottom_width, new_bottom_height), Image.Resampling.LANCZOS)
    
    # Create new combined image
    new_width = max(top_part.width, enlarged_bottom.width)
    new_height = top_part.height + enlarged_bottom.height
    
    new_img = Image.new("RGBA", (new_width, new_height), (0, 0, 0, 0))
    
    # Paste top part centered horizontally
    top_x = (new_width - top_part.width) // 2
    new_img.paste(top_part, (top_x, 0))
    
    # Paste bottom part centered horizontally
    bottom_x = (new_width - enlarged_bottom.width) // 2
    new_img.paste(enlarged_bottom, (bottom_x, top_part.height))
    
    # Save back to public/logo.png
    new_img.save(img_path)
    print(f"Saved enlarged logo. New size: {new_img.size}")

if __name__ == "__main__":
    enlarge_text(os.path.join("public", "logo.png"))
