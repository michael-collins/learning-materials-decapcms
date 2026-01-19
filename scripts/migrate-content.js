#!/usr/bin/env node

/**
 * Content Migration Script
 * Migrates content from 3d-pathways-nuxt to learning-materials-decapcms
 */

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  sourceRepo: '/Users/msc227/Documents/repos/3d-pathways-nuxt',
  targetRepo: '/Users/msc227/Documents/repos/open-curriculum/oerschema/learning-materials-decapcms',
  collections: ['exercises', 'projects', 'specializations', 'pathways', 'lectures', 'docs'],
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
};

// Path mapping for assets
const PATH_MAPPINGS = {
  '/assets/': '/uploads/',
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

// Statistics
const stats = {
  contentFiles: { processed: 0, migrated: 0, errors: 0 },
  mediaFiles: { processed: 0, copied: 0, errors: 0 },
  errors: [],
  warnings: [],
};

// Files data (attachments) - loaded at startup
let filesData = {};

/**
 * Load files data from files-by-slug.json
 */
async function loadFilesData() {
  const filesPath = path.join(CONFIG.sourceRepo, 'content', 'data', 'files-by-slug.json');
  
  if (await fs.pathExists(filesPath)) {
    filesData = await fs.readJson(filesPath);
    console.log(`✓ Loaded attachments data for ${Object.keys(filesData).length} content items`);
  } else {
    console.log('⊘ No files-by-slug.json found - attachments will not be migrated');
  }
}

/**
 * Transform license format from old to new
 */
function transformLicense(oldLicense) {
  if (!oldLicense) return null;
  return LICENSE_MAP[oldLicense.toLowerCase()] || oldLicense;
}

/**
 * Update asset paths in content
 */
function updateAssetPaths(content) {
  let updated = content;
  for (const [oldPath, newPath] of Object.entries(PATH_MAPPINGS)) {
    const regex = new RegExp(oldPath, 'g');
    updated = updated.replace(regex, newPath);
  }
  return updated;
}

/**
 * Transform frontmatter for target format
 */
function transformFrontmatter(data, collectionType, slug) {
  const transformed = { ...data };

  // Transform license if present
  if (transformed.license) {
    transformed.license = transformLicense(transformed.license);
  }

  // Update image path if present
  if (transformed.image) {
    transformed.image = updateAssetPaths(transformed.image);
  }

  // Capitalize difficulty values for consistency
  if (transformed.difficulty) {
    transformed.difficulty = transformed.difficulty.charAt(0).toUpperCase() + 
                             transformed.difficulty.slice(1);
  }

  // Ensure slug is present
  if (!transformed.slug && transformed.title) {
    transformed.slug = transformed.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Enable embedding for exercises and projects
  if (collectionType === 'exercises' || collectionType === 'projects') {
    transformed.allowEmbed = true;
  }

  // Add attachments from files-by-slug.json
  if ((collectionType === 'exercises' || collectionType === 'projects') && filesData[slug]) {
    const attachments = filesData[slug].map(fileEntry => ({
      file: updateAssetPaths(fileEntry.attachments?.[0]?.url || ''),
      title: fileEntry.name || '',
      description: fileEntry.description || '',
      alt: fileEntry.alt || '',
      citation: fileEntry.citation || '',
      sourceUrl: fileEntry.sourceUrl || '',
      type: fileEntry.attachments?.[0]?.type || '',
    })).filter(a => a.file); // Only include entries with a file

    if (attachments.length > 0) {
      transformed.attachments = attachments;
    }
  }

  return transformed;
}

/**
 * Migrate a single content file
 */
async function migrateContentFile(sourcePath, collectionType) {
  try {
    stats.contentFiles.processed++;
    
    const content = await fs.readFile(sourcePath, 'utf8');
    const parsed = matter(content);

    // Get slug from filename (remove .md extension)
    const filename = path.basename(sourcePath);
    const slug = filename.replace(/\.md$/, '');

    // Transform frontmatter (pass slug for attachments lookup)
    const transformedData = transformFrontmatter(parsed.data, collectionType, slug);
    
    // Update paths in content body
    let transformedContent = updateAssetPaths(parsed.content);
    
    // Convert Google Slides iframe components to google-slides-component
    transformedContent = transformedContent.replace(
      /::iframe-component\s*---\s*src:\s*(https:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9-_]+)\/[^\s]*)\s*title:\s*([^\n]+)\s*---\s*::/g,
      (match, fullUrl, slideId, title) => `::google-slides-component\n---\nid: ${slideId}\ntitle: ${title.trim()}\n---\n::`
    );
    
    // Remove duplicate H1 title from content (displayed in page header)
    transformedContent = transformedContent.replace(/^#\s+.+?\n+/m, '');

    // Reconstruct the file
    const output = matter.stringify(transformedContent, transformedData);

    // Determine target path
    const targetPath = path.join(
      CONFIG.targetRepo,
      'content',
      collectionType,
      filename
    );

    // Write file (unless dry run)
    if (!CONFIG.dryRun) {
      await fs.ensureDir(path.dirname(targetPath));
      await fs.writeFile(targetPath, output, 'utf8');
    }

    if (CONFIG.verbose) {
      console.log(`✓ Migrated: ${filename}`);
    }

    stats.contentFiles.migrated++;
    return { success: true, path: targetPath };
  } catch (error) {
    stats.contentFiles.errors++;
    stats.errors.push({
      type: 'content',
      file: sourcePath,
      error: error.message,
    });
    console.error(`✗ Error migrating ${sourcePath}: ${error.message}`);
    return { success: false, error };
  }
}

/**
 * Migrate content files for a collection
 */
async function migrateCollection(collectionType) {
  const sourcePath = path.join(CONFIG.sourceRepo, 'content', collectionType);
  
  // Check if source directory exists
  if (!await fs.pathExists(sourcePath)) {
    console.log(`⊘ Skipping ${collectionType} - source directory not found`);
    return;
  }

  const pattern = path.join(sourcePath, '*.md');
  const files = await glob(pattern);

  console.log(`\nMigrating ${collectionType}: ${files.length} files`);

  for (const file of files) {
    await migrateContentFile(file, collectionType);
  }
}

/**
 * Copy media assets (skip thumbnail variations - Nuxt Image will generate them)
 */
async function migrateMediaAssets() {
  console.log('\nMigrating media assets...');

  const assetDirs = ['exercises', 'projects', 'files'];

  for (const dir of assetDirs) {
    const sourcePath = path.join(CONFIG.sourceRepo, 'public', 'assets', dir);
    const targetPath = path.join(CONFIG.targetRepo, 'public', 'uploads', dir);

    if (!await fs.pathExists(sourcePath)) {
      console.log(`⊘ Skipping ${dir} - source directory not found`);
      continue;
    }

    try {
      const allFiles = await fs.readdir(sourcePath);
      
      // Filter out thumbnail variations - Nuxt Image will generate them automatically
      const files = allFiles.filter(file => {
        // Skip thumbnail variations
        if (file.includes('_thumbnail_small') || 
            file.includes('_thumbnail_medium') || 
            file.includes('_thumbnail_large')) {
          return false;
        }
        return true;
      });
      
      const skipped = allFiles.length - files.length;
      console.log(`Copying ${dir}: ${files.length} files (skipping ${skipped} thumbnail variations)`);

      if (!CONFIG.dryRun) {
        await fs.ensureDir(targetPath);
        
        // Copy only the filtered files
        for (const file of files) {
          const sourceFile = path.join(sourcePath, file);
          const targetFile = path.join(targetPath, file);
          await fs.copy(sourceFile, targetFile, {
            overwrite: false,
            errorOnExist: false,
          });
        }
      }

      stats.mediaFiles.processed += files.length;
      stats.mediaFiles.copied += files.length;
      console.log(`✓ Copied ${files.length} files to uploads/${dir}/ (Nuxt Image will generate responsive variants)`);
    } catch (error) {
      stats.mediaFiles.errors++;
      stats.errors.push({
        type: 'media',
        directory: dir,
        error: error.message,
      });
      console.error(`✗ Error copying ${dir}: ${error.message}`);
    }
  }
}

/**
 * Copy data files
 */
async function migrateDataFiles() {
  console.log('\nMigrating data files...');

  const sourcePath = path.join(CONFIG.sourceRepo, 'content', 'data');
  const targetPath = path.join(CONFIG.targetRepo, 'content', 'data');

  if (!await fs.pathExists(sourcePath)) {
    console.log('⊘ No data directory found in source');
    return;
  }

  try {
    const files = await fs.readdir(sourcePath);
    console.log(`Copying ${files.length} data files`);

    if (!CONFIG.dryRun) {
      await fs.ensureDir(targetPath);
      await fs.copy(sourcePath, targetPath, {
        overwrite: false,
        errorOnExist: false,
      });
    }

    console.log(`✓ Copied data files`);
  } catch (error) {
    stats.errors.push({
      type: 'data',
      error: error.message,
    });
    console.error(`✗ Error copying data files: ${error.message}`);
  }
}

/**
 * Migrate rubrics from JSON to markdown files
 */
async function migrateRubrics() {
  console.log('\nMigrating rubrics...');

  const rubricsJsonPath = path.join(CONFIG.sourceRepo, 'content', 'data', 'rubrics.json');
  
  if (!await fs.pathExists(rubricsJsonPath)) {
    console.log('⊘ No rubrics.json found');
    return;
  }

  try {
    const rubricsData = await fs.readJson(rubricsJsonPath);
    console.log(`Converting ${rubricsData.length} rubrics to markdown files`);

    for (const rubric of rubricsData) {
      // Create frontmatter
      const frontmatter = {
        recordId: rubric.id,
        name: rubric.name,
        slug: rubric.slug,
        description: rubric.description,
        criteria: rubric.criteria,
      };

      // Create markdown body
      const body = `# ${rubric.name}

${rubric.description}

## Grading Criteria

${rubric.criteria.map(criterion => `### ${criterion.name}

${criterion.description}`).join('\n\n')}
`;

      // Create the full file content
      const fileContent = matter.stringify(body, frontmatter);

      // Write to file
      const targetPath = path.join(
        CONFIG.targetRepo,
        'content',
        'rubrics',
        `${rubric.slug}.md`
      );

      if (!CONFIG.dryRun) {
        await fs.ensureDir(path.dirname(targetPath));
        await fs.writeFile(targetPath, fileContent, 'utf8');
      }

      if (CONFIG.verbose) {
        console.log(`✓ Converted rubric: ${rubric.slug}`);
      }

      stats.contentFiles.processed++;
      stats.contentFiles.migrated++;
    }

    console.log(`✓ Converted ${rubricsData.length} rubrics to markdown`);
  } catch (error) {
    stats.errors.push({
      type: 'rubrics',
      error: error.message,
    });
    console.error(`✗ Error migrating rubrics: ${error.message}`);
  }
}

/**
 * Validate migrated content
 */
async function validateMigration() {
  console.log('\n=== Validation ===');

  // Check for broken image references
  const brokenImages = [];
  
  for (const collection of CONFIG.collections) {
    const contentPath = path.join(CONFIG.targetRepo, 'content', collection);
    
    if (!await fs.pathExists(contentPath)) continue;

    const files = await glob(path.join(contentPath, '*.md'));
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const imageRefs = content.match(/!\[.*?\]\((.*?)\)/g) || [];
      
      for (const ref of imageRefs) {
        const match = ref.match(/!\[.*?\]\((.*?)\)/);
        if (match && match[1]) {
          let imagePath = match[1];
          
          // Convert to absolute path
          if (imagePath.startsWith('/uploads/')) {
            imagePath = path.join(CONFIG.targetRepo, 'public', imagePath);
          }
          
          if (!await fs.pathExists(imagePath)) {
            brokenImages.push({
              file: path.basename(file),
              image: match[1],
            });
          }
        }
      }
    }
  }

  if (brokenImages.length > 0) {
    console.log(`⚠ Found ${brokenImages.length} broken image references`);
    stats.warnings.push(...brokenImages.map(b => `Broken image in ${b.file}: ${b.image}`));
  } else {
    console.log('✓ No broken image references found');
  }
}

/**
 * Generate migration report
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION REPORT');
  console.log('='.repeat(60));
  
  if (CONFIG.dryRun) {
    console.log('\n*** DRY RUN MODE - No files were actually modified ***\n');
  }

  console.log('\nContent Files:');
  console.log(`  Processed: ${stats.contentFiles.processed}`);
  console.log(`  Migrated:  ${stats.contentFiles.migrated}`);
  console.log(`  Errors:    ${stats.contentFiles.errors}`);

  console.log('\nMedia Files:');
  console.log(`  Processed: ${stats.mediaFiles.processed}`);
  console.log(`  Copied:    ${stats.mediaFiles.copied}`);
  console.log(`  Errors:    ${stats.mediaFiles.errors}`);

  if (stats.warnings.length > 0) {
    console.log(`\nWarnings (${stats.warnings.length}):`);
    stats.warnings.forEach(w => console.log(`  ⚠ ${w}`));
  }

  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    stats.errors.forEach(e => {
      console.log(`  ✗ [${e.type}] ${e.file || e.directory || 'Unknown'}`);
      console.log(`    ${e.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // Save report to file
  const reportPath = path.join(CONFIG.targetRepo, 'migration-report.json');
  if (!CONFIG.dryRun) {
    fs.writeJsonSync(reportPath, {
      timestamp: new Date().toISOString(),
      stats,
      config: {
        sourceRepo: CONFIG.sourceRepo,
        targetRepo: CONFIG.targetRepo,
        collections: CONFIG.collections,
      },
    }, { spaces: 2 });
    console.log(`\nDetailed report saved to: migration-report.json`);
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('='.repeat(60));
  console.log('CONTENT MIGRATION SCRIPT');
  console.log('='.repeat(60));
  console.log(`Source: ${CONFIG.sourceRepo}`);
  console.log(`Target: ${CONFIG.targetRepo}`);
  
  if (CONFIG.dryRun) {
    console.log('\n*** DRY RUN MODE ***');
  }
  
  console.log('');

  // Validate paths
  if (!await fs.pathExists(CONFIG.sourceRepo)) {
    console.error('Error: Source repository not found');
    process.exit(1);
  }

  if (!await fs.pathExists(CONFIG.targetRepo)) {
    console.error('Error: Target repository not found');
    process.exit(1);
  }

  try {
    // Load files data for attachments
    console.log('\n=== Loading Files Data ===');
    await loadFilesData();

    // Phase 1: Migrate content
    console.log('\n=== Phase 1: Content Migration ===');
    for (const collection of CONFIG.collections) {
      await migrateCollection(collection);
    }

    // Phase 2: Migrate media
    console.log('\n=== Phase 2: Media Assets ===');
    await migrateMediaAssets();

    // Phase 3: Migrate data files
    console.log('\n=== Phase 3: Data Files ===');
    await migrateDataFiles();

    // Phase 4: Migrate rubrics
    console.log('\n=== Phase 4: Rubrics ===');
    await migrateRubrics();

    // Phase 5: Validation
    if (!CONFIG.dryRun) {
      await validateMigration();
    }

    // Generate report
    generateReport();

    console.log('\n✓ Migration completed successfully!');
    
    if (CONFIG.dryRun) {
      console.log('\nRun without --dry-run to perform actual migration.');
    }

  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { migrate };
