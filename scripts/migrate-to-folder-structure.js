#!/usr/bin/env node

/**
 * Migration script to convert flat markdown files to folder-based structure
 * Old: content/exercises/slug.md
 * New: content/exercises/slug/index.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '../content');
const CONTENT_TYPES = ['exercises', 'lectures', 'tutorials', 'articles', 'projects', 'lessons', 'pathways', 'specializations'];

function migrateContentType(contentType) {
  const contentPath = path.join(CONTENT_DIR, contentType);
  
  if (!fs.existsSync(contentPath)) {
    console.log(`✓ Skipping ${contentType} - directory does not exist`);
    return;
  }

  const files = fs.readdirSync(contentPath);
  let migratedCount = 0;
  let skippedCount = 0;

  files.forEach(file => {
    const fullPath = path.join(contentPath, file);
    const stat = fs.statSync(fullPath);

    // Skip if it's already a directory
    if (stat.isDirectory()) {
      const indexPath = path.join(fullPath, 'index.md');
      if (!fs.existsSync(indexPath)) {
        console.log(`⚠ Directory exists without index.md: ${contentType}/${file}`);
      }
      skippedCount++;
      return;
    }

    // Only process markdown files
    if (!file.endsWith('.md')) {
      return;
    }

    // Create folder with same name as file (minus .md)
    const folderName = file.replace('.md', '');
    const folderPath = path.join(contentPath, folderName);

    // Skip if folder already exists
    if (fs.existsSync(folderPath)) {
      console.log(`⚠ Skipping ${contentType}/${file} - folder ${folderName} already exists`);
      skippedCount++;
      return;
    }

    try {
      // Create folder
      fs.mkdirSync(folderPath, { recursive: true });

      // Read file content
      const fileContent = fs.readFileSync(fullPath, 'utf8');

      // Write to index.md in new folder
      fs.writeFileSync(path.join(folderPath, 'index.md'), fileContent);

      // Remove original file
      fs.unlinkSync(fullPath);

      console.log(`✓ Migrated ${contentType}/${file} → ${contentType}/${folderName}/index.md`);
      migratedCount++;
    } catch (error) {
      console.error(`✗ Error migrating ${contentType}/${file}:`, error.message);
    }
  });

  console.log(`\n📊 ${contentType}: ${migratedCount} migrated, ${skippedCount} skipped\n`);
}

console.log('🚀 Starting content migration to folder structure...\n');

CONTENT_TYPES.forEach(migrateContentType);

console.log('✅ Migration complete!');
