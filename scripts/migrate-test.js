#!/usr/bin/env node

/**
 * Test Migration Script - Single Exercise
 * Tests migration with one exercise to verify everything works
 */

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  sourceRepo: '/Users/msc227/Documents/repos/3d-pathways-nuxt',
  targetRepo: '/Users/msc227/Documents/repos/open-curriculum/oerschema/learning-materials-decapcms',
  testFile: 'animated-procedural-textures.md', // The exercise to test with
};

// License format mapping
const LICENSE_MAP = {
  'cc-by-40': 'CC BY 4.0',
  'cc-by-sa-40': 'CC BY-SA 4.0',
  'cc-by-nc-40': 'CC BY-NC 4.0',
  'cc-by-nc-sa-40': 'CC BY-NC-SA 4.0',
  'cc-by-nd-40': 'CC BY-ND 4.0',
  'cc-by-nc-nd-40': 'CC BY-NC-ND 4.0',
  'cc0-10': 'CC0 1.0',
};

function transformLicense(oldLicense) {
  if (!oldLicense) return null;
  return LICENSE_MAP[oldLicense.toLowerCase()] || oldLicense;
}

function updateAssetPaths(content) {
  return content.replace(/\/assets\//g, '/uploads/');
}

async function migrateTestExercise() {
  console.log('='.repeat(60));
  console.log('TEST MIGRATION - Single Exercise');
  console.log('='.repeat(60));
  console.log(`File: ${CONFIG.testFile}\n`);

  const sourcePath = path.join(CONFIG.sourceRepo, 'content', 'exercises', CONFIG.testFile);
  const targetPath = path.join(CONFIG.targetRepo, 'content', 'exercises', CONFIG.testFile);

  try {
    // Read source file
    console.log('1. Reading source file...');
    const content = await fs.readFile(sourcePath, 'utf8');
    const parsed = matter(content);
    console.log('   ✓ File read successfully');
    console.log('   Original frontmatter:', JSON.stringify(parsed.data, null, 2));

    // Transform frontmatter
    console.log('\n2. Transforming frontmatter...');
    const transformed = { ...parsed.data };
    
    if (transformed.license) {
      const oldLicense = transformed.license;
      transformed.license = transformLicense(transformed.license);
      console.log(`   ✓ License: ${oldLicense} → ${transformed.license}`);
    }

    if (transformed.difficulty) {
      const oldDifficulty = transformed.difficulty;
      transformed.difficulty = transformed.difficulty.charAt(0).toUpperCase() + 
                               transformed.difficulty.slice(1);
      console.log(`   ✓ Difficulty: ${oldDifficulty} → ${transformed.difficulty}`);
    }

    if (transformed.image) {
      const oldImage = transformed.image;
      transformed.image = updateAssetPaths(transformed.image);
      console.log(`   ✓ Image path: ${oldImage} → ${transformed.image}`);
    }

    transformed.allowEmbed = true;
    console.log('   ✓ Set allowEmbed: true');

    // Transform body content
    console.log('\n3. Updating body content paths...');
    let transformedContent = updateAssetPaths(parsed.content);
    const pathsChanged = (parsed.content.match(/\/assets\//g) || []).length;
    console.log(`   ✓ Updated ${pathsChanged} asset path(s) in body`);
    
    // Convert Google Slides iframe components to google-slides-component
    const googleSlidesPattern = /::iframe-component\s*---\s*src:\s*(https:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9-_]+)\/[^\s]*)\s*title:\s*([^\n]+)\s*---\s*::/g;
    if (googleSlidesPattern.test(transformedContent)) {
      transformedContent = transformedContent.replace(googleSlidesPattern,
        (match, fullUrl, slideId, title) => `::google-slides-component\n---\nid: ${slideId}\ntitle: ${title.trim()}\n---\n::`
      );
      console.log('   ✓ Converted Google Slides iframe to google-slides-component');
    }
    
    // Remove duplicate H1 title from content
    const h1Match = transformedContent.match(/^#\s+.+?\n+/m);
    if (h1Match) {
      transformedContent = transformedContent.replace(/^#\s+.+?\n+/m, '');
      console.log('   ✓ Removed duplicate H1 title from content');
    }

    // Write file
    console.log('\n4. Writing migrated file...');
    const output = matter.stringify(transformedContent, transformed);
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, output, 'utf8');
    console.log(`   ✓ Written to: ${targetPath}`);

    // Show what was written
    console.log('\n5. Transformed frontmatter:');
    console.log(JSON.stringify(transformed, null, 2));

    // Copy associated media files (skip thumbnails - Nuxt Image will generate them)
    console.log('\n6. Looking for associated media files...');
    const recordId = parsed.data.recordId;
    if (recordId) {
      const sourceAssetsDir = path.join(CONFIG.sourceRepo, 'public', 'assets', 'exercises');
      const targetAssetsDir = path.join(CONFIG.targetRepo, 'public', 'uploads', 'exercises');
      
      const allFiles = await fs.readdir(sourceAssetsDir);
      const relatedFiles = allFiles.filter(f => {
        // Only copy files for this record
        if (!f.startsWith(recordId)) return false;
        
        // Skip thumbnail variations - Nuxt Image will generate them
        if (f.includes('_thumbnail_small') || 
            f.includes('_thumbnail_medium') || 
            f.includes('_thumbnail_large')) {
          return false;
        }
        
        return true;
      });
      
      const skipped = allFiles.filter(f => f.startsWith(recordId)).length - relatedFiles.length;
      console.log(`   Found ${relatedFiles.length} files for record ${recordId} (skipping ${skipped} thumbnails)`);
      
      await fs.ensureDir(targetAssetsDir);
      
      for (const file of relatedFiles) {
        const sourcePath = path.join(sourceAssetsDir, file);
        const targetPath = path.join(targetAssetsDir, file);
        await fs.copy(sourcePath, targetPath);
        console.log(`   ✓ Copied: ${file}`);
      }
      
      console.log(`   (Nuxt Image will auto-generate responsive variants)`);
    } else {
      console.log('   ⚠ No recordId found - skipping media files');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ TEST MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Check the migrated file:');
    console.log(`   cat ${targetPath}`);
    console.log('2. Start dev server and test:');
    console.log('   npm run dev');
    console.log('3. Navigate to /admin and verify the exercise appears');
    console.log('4. Check the exercise listing page');
    console.log('5. View the exercise detail page');

  } catch (error) {
    console.error('\n✗ Error during migration:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

migrateTestExercise();
