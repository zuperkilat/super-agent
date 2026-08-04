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
    
    # Fix heroImage paths that don't start with ../
    if re.search(r'^heroImage: blog-placeholder-\d+\.jpg$', content, re.MULTILINE):
        content = re.sub(
            r'^(heroImage: blog-placeholder-(\d+)\.jpg)$',
            r"heroImage: '../../assets/blog-placeholder-\2.jpg'",
            content,
            flags=re.MULTILINE
        )
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        fixed += 1
        print(f"FIXED IMG {filename}")

print(f"Total fixed: {fixed}")
