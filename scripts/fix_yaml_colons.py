#!/usr/bin/env python3
import os
import re

BLOG_DIR = "/data/astro-blog/src/content/blog"

fixed = 0
for filename in os.listdir(BLOG_DIR):
    if not filename.endswith(".md"):
        continue
    path = os.path.join(BLOG_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Only process frontmatter block
    if not content.startswith("---"):
        continue
    
    parts = content.split("---", 2)
    if len(parts) < 3:
        continue
    
    frontmatter = parts[1]
    body = parts[2]
    
    new_fm = frontmatter
    # Quote title if it contains colon and is not already quoted
    for key in ["title", "description"]:
        pattern = rf'^({key}: )(.*)$'
        def replacer(m):
            val = m.group(2).strip()
            if val.startswith("'") or val.startswith('"'):
                return m.group(0)
            if ":" in val:
                return f'{m.group(1)}\'{val}\''
            return m.group(0)
        new_fm = re.sub(pattern, replacer, new_fm, flags=re.MULTILINE)
    
    if new_fm != frontmatter:
        content = "---" + new_fm + "---" + body
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        fixed += 1
        print(f"FIXED FM {filename}")

print(f"Total fixed: {fixed}")
