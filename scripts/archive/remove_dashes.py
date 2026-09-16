import os
import glob

def replace_dashes():
    # search in src/**/*.astro and src/**/*.md
    files = glob.glob('src/**/*.astro', recursive=True) + glob.glob('src/**/*.md', recursive=True)
    for filepath in files:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content.replace(' — ', ' - ').replace('—', '-').replace(' – ', ' - ').replace('–', '-')
        
        if content != new_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")

if __name__ == "__main__":
    replace_dashes()
