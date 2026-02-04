#!/usr/bin/env node

/**
 * Rename all /v/1.0.0.md files to /v/0.9.0.md
 * and update their frontmatter version fields
 */

import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { globSync } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 Finding all /v/1.0.0.md files...\n');

// Find all 1.0.0.md files in /v/ directories
const files = globSync('content/**/v/1.0.0.md', { cwd: projectRoot });

console.log(`📁 Found ${files.length} files to rename\n`);

let successCount = 0;
let errorCount = 0;
const errors = [];

for (const filePath of files) {
  const fullPath = join(projectRoot, filePath);
  const newFilePath = filePath.replace('/v/1.0.0.md', '/v/0.9.0.md');
  const newFullPath = join(projectRoot, newFilePath);

  try {
    // Check if target already exists
    if (existsSync(newFullPath)) {
      console.log(`⚠️  SKIP: ${newFilePath} already exists`);
      errorCount++;
      errors.push({ file: filePath, error: 'Target file already exists' });
      continue;
    }

    // Read the file content
    const content = readFileSync(fullPath, 'utf-8');

    // Update frontmatter: version: "1.0.0" -> version: "0.9.0"
    // Also update _snapshotFrom if it references 1.0.0
    const updatedContent = content
      .replace(/^version:\s*["']?1\.0\.0["']?$/m, 'version: "0.9.0"')
      .replace(/^_snapshotFrom:\s*["']?1\.0\.0["']?$/m, '_snapshotFrom: "1.0.0"');

    // Rename the file
    renameSync(fullPath, newFullPath);

    // Write updated content
    writeFileSync(newFullPath, updatedContent, 'utf-8');

    console.log(`✅ ${filePath} → ${newFilePath}`);
    successCount++;
  } catch (error) {
    console.error(`❌ ERROR: ${filePath}`);
    console.error(`   ${error.message}\n`);
    errorCount++;
    errors.push({ file: filePath, error: error.message });
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ Successfully renamed: ${successCount} files`);
console.log(`❌ Errors: ${errorCount} files`);
console.log('='.repeat(60));

if (errors.length > 0) {
  console.log('\n❌ Errors encountered:');
  errors.forEach(({ file, error }) => {
    console.log(`   ${file}: ${error}`);
  });
  process.exit(1);
}

console.log('\n✨ All done!');
