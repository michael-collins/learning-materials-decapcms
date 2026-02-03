#!/usr/bin/env node

/**
 * Add author and authorUrl fields to all lessons
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.join(__dirname, '../content/lessons');

// Find all lesson index.md files
const lessonFiles = glob.sync('*/index.md', { cwd: contentDir });

console.log(`Found ${lessonFiles.length} lesson files`);

let updatedCount = 0;

lessonFiles.forEach(file => {
  const filePath = path.join(contentDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if author already exists
  if (content.includes('author:')) {
    console.log(`✓ ${file} already has author`);
    return;
  }
  
  // Find the frontmatter section
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    console.log(`✗ ${file} - no frontmatter found`);
    return;
  }
  
  const frontmatter = frontmatterMatch[1];
  
  // Find where to insert (after allowEmbed or published, before license or version)
  let insertAfter = 'allowEmbed: true';
  if (!frontmatter.includes('allowEmbed:')) {
    insertAfter = 'published: true';
  }
  
  if (!frontmatter.includes(insertAfter)) {
    console.log(`✗ ${file} - couldn't find insertion point`);
    return;
  }
  
  // Insert author and authorUrl after the insertion point
  const updatedContent = content.replace(
    insertAfter,
    `${insertAfter}\nauthor: Michael Collins\nauthorUrl: https://michaelcollins.xyz`
  );
  
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log(`✓ Added author to ${file}`);
  updatedCount++;
});

console.log(`\n✅ Updated ${updatedCount} lesson(s)`);
