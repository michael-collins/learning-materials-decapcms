#!/usr/bin/env node

/**
 * Check if modified files are archived version snapshots
 * Used by GitHub Action to validate PRs
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const changedFilesInput = process.argv[2] || '';
const changedFiles = changedFilesInput.split('\n').filter(f => f.trim());

if (changedFiles.length === 0) {
  console.log('No version files were modified.');
  process.exit(0);
}

let hasArchivedEdits = false;
let hasCriticalEdits = false;
const warnings = [];

console.log(`\n🔍 Checking ${changedFiles.length} modified version file(s)...\n`);

changedFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found (may be deleted): ${filePath}`);
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter } = matter(content);
    
    const fileName = path.basename(filePath);
    // Check if file is in v/ subdirectory with version pattern: /v/1.0.0.md
    const isVersionFile = /\/v\/\d+\.\d+\.\d+\.md$/.test(filePath);
    
    if (isVersionFile) {
      console.log(`📄 ${filePath}`);
      
      // Check if this is an archived version
      if (frontmatter.versionStatus === 'archived') {
        hasArchivedEdits = true;
        warnings.push({
          file: filePath,
          severity: 'warning',
          message: 'This is an ARCHIVED version. Edits will affect existing embeds.'
        });
        console.log(`   ⚠️  Status: ARCHIVED`);
      }
      
      // Check if this is marked as deprecated
      if (frontmatter.versionStatus === 'deprecated') {
        warnings.push({
          file: filePath,
          severity: 'info',
          message: 'This version is deprecated but may still be embedded.'
        });
        console.log(`   ℹ️  Status: DEPRECATED`);
      }
      

      // Show version info
      if (frontmatter.version) {
        console.log(`   📌 Version: ${frontmatter.version}`);
      }
      
      console.log('');
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(60));

if (warnings.length === 0) {
  console.log('✅ No critical issues found.');
  process.exit(0);
}

// Group by severity
const critical = warnings.filter(w => w.severity === 'critical');
const warning = warnings.filter(w => w.severity === 'warning');
const info = warnings.filter(w => w.severity === 'info');

if (critical.length > 0) {
  console.log(`\n🔴 CRITICAL (${critical.length}):`);
  critical.forEach(w => {
    console.log(`   ${w.file}`);
    console.log(`   └─ ${w.message}`);
  });
}

if (warning.length > 0) {
  console.log(`\n⚠️  WARNING (${warning.length}):`);
  warning.forEach(w => {
    console.log(`   ${w.file}`);
    console.log(`   └─ ${w.message}`);
  });
}

if (info.length > 0) {
  console.log(`\nℹ️  INFO (${info.length}):`);
  info.forEach(w => {
    console.log(`   ${w.file}`);
    console.log(`   └─ ${w.message}`);
  });
}

console.log('\n' + '='.repeat(60));
console.log('⚠️  This PR requires admin review before merging!');
console.log('='.repeat(60) + '\n');

// Exit with warning code if critical issues found
if (hasCriticalEdits) {
  console.log('::set-output name=severity::critical');
  process.exit(1);
} else if (hasArchivedEdits) {
  console.log('::set-output name=severity::warning');
  process.exit(0); // Don't fail, just warn
} else {
  console.log('::set-output name=severity::info');
  process.exit(0);
}
