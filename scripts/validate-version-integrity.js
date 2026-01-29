#!/usr/bin/env node

/**
 * Validate version file integrity across the repository
 * Ensures version snapshots haven't been corrupted or accidentally modified
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import crypto from 'crypto';

const contentTypes = ['exercises', 'tutorials', 'lectures', 'articles', 'projects'];
const errors = [];
const warnings = [];

console.log('🔍 Validating version file integrity...\n');

// Load version registry if it exists
const registryPath = './content/data/version-registry.json';
let registry = {};

if (fs.existsSync(registryPath)) {
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    console.log('✓ Loaded version registry\n');
  } catch (error) {
    warnings.push(`Failed to load version registry: ${error.message}`);
  }
}

// Check each content type
for (const type of contentTypes) {
  const pattern = `./content/${type}/**/v[0-9]*.md`;
  const versionFiles = glob.sync(pattern);
  
  if (versionFiles.length === 0) {
    continue;
  }
  
  console.log(`📁 ${type}: Found ${versionFiles.length} version file(s)`);
  
  versionFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data: frontmatter } = matter(content);
      const fileName = path.basename(filePath);
      // Check if file is in v/ subdirectory: content/exercises/slug/v/1.0.0.md
      const pathParts = filePath.split('/');
      const isInVersionDir = pathParts[pathParts.length - 2] === 'v';
      const versionMatch = isInVersionDir ? fileName.match(/(\d+\.\d+\.\d+)\.md$/) : null;
      
      if (!versionMatch) {
        errors.push({
          file: filePath,
          message: 'Invalid version file naming pattern or not in v/ subdirectory'
        });
        return;
      }
      
      const fileVersion = versionMatch[1];
      
      // Check 1: Frontmatter version matches filename
      if (frontmatter.version && frontmatter.version !== fileVersion) {
        errors.push({
          file: filePath,
          message: `Version mismatch: filename has ${fileVersion}, frontmatter has ${frontmatter.version}`
        });
      }
      
      // Check 2: Version files should be marked as archived or have publishEmbed=true
      if (frontmatter.versionStatus === 'latest') {
        warnings.push({
          file: filePath,
          message: 'Version file marked as "latest" - should be "archived"'
        });
      }
      
      // Check 3: Required fields
      if (!frontmatter.version) {
        errors.push({
          file: filePath,
          message: 'Missing required field: version'
        });
      }
      
      // Check 4: If in registry, verify integrity
      const slug = path.basename(path.dirname(filePath));
      if (registry[slug]?.versions?.[fileVersion]) {
        const registryEntry = registry[slug].versions[fileVersion];
        
        // Verify status
        if (registryEntry.status !== frontmatter.versionStatus) {
          warnings.push({
            file: filePath,
            message: `Status mismatch with registry: file has "${frontmatter.versionStatus}", registry has "${registryEntry.status}"`
          });
        }
      }
      
      console.log(`  ✓ ${fileName} (${frontmatter.versionStatus || 'no status'})`);
      
    } catch (error) {
      errors.push({
        file: filePath,
        message: `Failed to validate: ${error.message}`
      });
    }
  });
  
  console.log('');
}

// Print summary
console.log('='.repeat(60));
console.log('📊 VALIDATION RESULTS');
console.log('='.repeat(60));

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ All version files are valid!\n');
  process.exit(0);
}

if (errors.length > 0) {
  console.log(`\n❌ ERRORS (${errors.length}):`);
  errors.forEach(err => {
    console.log(`\n  File: ${err.file}`);
    console.log(`  Error: ${err.message}`);
  });
}

if (warnings.length > 0) {
  console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
  warnings.forEach(warn => {
    console.log(`\n  File: ${warn.file}`);
    console.log(`  Warning: ${warn.message}`);
  });
}

console.log('\n' + '='.repeat(60));

if (errors.length > 0) {
  console.log('❌ Validation failed with errors!');
  process.exit(1);
} else {
  console.log('⚠️  Validation passed with warnings.');
  process.exit(0);
}
