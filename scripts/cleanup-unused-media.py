#!/usr/bin/env python3
"""
Find and remove unreferenced media files from public/uploads/
"""
import os
import re
from pathlib import Path

# Get all referenced files from content
referenced_files = set()
content_dir = Path('content')

for md_file in content_dir.rglob('*.md'):
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()
        # Find all /uploads/filename references
        matches = re.findall(r'/uploads/([^\s\'")\]]+)', content)
        for match in matches:
            referenced_files.add(match)

print(f"Found {len(referenced_files)} referenced files")
print("\nSample referenced files:")
for i, f in enumerate(sorted(referenced_files)[:10]):
    print(f"  {f}")

# Get all files in public/uploads
uploads_dir = Path('public/uploads')
all_files = set()
for f in uploads_dir.iterdir():
    if f.is_file() and f.name != '.gitkeep':
        all_files.add(f.name)

print(f"\nTotal files in uploads: {len(all_files)}")

# Find unreferenced files
unreferenced = all_files - referenced_files
print(f"Unreferenced files: {len(unreferenced)}")

# Check for thumbnail duplicates
thumbnails = [f for f in unreferenced if 'thumbnail' in f.lower()]
print(f"Unreferenced thumbnail files: {len(thumbnails)}")

# Show breakdown
print("\nBreakdown of unreferenced files:")
fileAttachments = len([f for f in unreferenced if 'fileAttachments' in f])
thumbnail_full = len([f for f in unreferenced if 'thumbnail_full' in f])
other = len(unreferenced) - fileAttachments - thumbnail_full
print(f"  - fileAttachments: {fileAttachments}")
print(f"  - thumbnail_full variants: {thumbnail_full}")
print(f"  - other: {other}")

# Calculate total size
total_size = 0
for filename in unreferenced:
    filepath = uploads_dir / filename
    if filepath.exists():
        total_size += filepath.stat().st_size

print(f"\n📊 Moving {len(unreferenced)} unreferenced files to uploads/unreferenced/")
print(f"   Total size: {total_size / (1024*1024):.2f} MB")

# Create unreferenced directory
unreferenced_dir = uploads_dir / 'unreferenced'
unreferenced_dir.mkdir(exist_ok=True)

# Move files
moved_count = 0
for filename in unreferenced:
    src = uploads_dir / filename
    dst = unreferenced_dir / filename
    if src.exists():
        src.rename(dst)
        moved_count += 1

print(f"\n✅ Moved {moved_count} files to uploads/unreferenced/")
print(f"   Remaining in uploads/: {len(all_files) - moved_count}")
print(f"\n⚠️  Test your site, then delete uploads/unreferenced/ when ready")

# Save list to file
with open('unreferenced-media-files.txt', 'w') as f:
    for filename in sorted(unreferenced):
        f.write(f"{filename}\n")

print(f"💾 Full list saved to: unreferenced-media-files.txt")
