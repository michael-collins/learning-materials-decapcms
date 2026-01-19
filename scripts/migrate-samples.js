/**
 * Migrate specific sample files for testing
 * Usage: node scripts/migrate-samples.js
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  sourceRepo: '/Users/msc227/Documents/repos/3d-pathways-nuxt',
  targetRepo: path.resolve(__dirname, '..'),
};

// License mapping
const LICENSE_MAP = {
  'cc-by-40': 'CC BY 4.0',
  'cc-by-sa-40': 'CC BY-SA 4.0',
  'cc-by-nc-40': 'CC BY-NC 4.0',
  'cc-by-nc-sa-40': 'CC BY-NC-SA 4.0',
  'cc-by-nd-40': 'CC BY-ND 4.0',
  'cc-by-nc-nd-40': 'CC BY-NC-ND 4.0',
  'cc0-10': 'CC0 1.0',
};

// Difficulty mapping
const DIFFICULTY_MAP = {
  'beginner': 'Beginner',
  'intermediate': 'Intermediate',
  'advanced': 'Advanced',
};

/**
 * Transform frontmatter
 */
function transformFrontmatter(data) {
  const transformed = { ...data };

  // Transform license
  if (transformed.license && LICENSE_MAP[transformed.license]) {
    transformed.license = LICENSE_MAP[transformed.license];
  }

  // Transform difficulty
  if (transformed.difficulty && DIFFICULTY_MAP[transformed.difficulty.toLowerCase()]) {
    transformed.difficulty = DIFFICULTY_MAP[transformed.difficulty.toLowerCase()];
  }

  // Fix image paths in frontmatter
  if (transformed.image && transformed.image.includes('/assets/')) {
    transformed.image = transformed.image.replace(/\/assets\/(exercises|projects|files)\//g, '/uploads/$1/');
  }

  // Add allowEmbed for exercises and projects
  transformed.allowEmbed = true;

  return transformed;
}

/**
 * Update image paths in content
 */
function updateImagePaths(content) {
  // Update /assets/ to /uploads/
  return content.replace(/\/assets\/(exercises|projects|files)\//g, '/uploads/$1/');
}

/**
 * Convert Google Slides iframe components to google-slides-component
 */
function convertGoogleSlidesToComponent(content) {
  // Match ::iframe-component blocks with Google Slides URLs
  const iframePattern = /::iframe-component\s*---\s*src:\s*(https:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9-_]+)\/[^\s]*)\s*title:\s*([^\n]+)\s*---\s*::/g;
  
  return content.replace(iframePattern, (match, fullUrl, slideId, title) => {
    // Return google-slides-component with just the ID
    return `::google-slides-component\n---\nid: ${slideId}\ntitle: ${title.trim()}\n---\n::`;
  });
}

/**
 * Remove duplicate H1 title from content (since it's displayed in the page header)
 */
function removeDuplicateTitle(content) {
  // Remove the first H1 heading and any blank lines after it
  return content.replace(/^#\s+.+?\n+/m, '');
}

/**
 * Migrate a single content file
 */
async function migrateFile(sourcePath, collectionType) {
  const content = await fs.readFile(sourcePath, 'utf-8');
  const parsed = matter(content);

  // Transform frontmatter
  const transformed = transformFrontmatter(parsed.data);

  // Update image paths, convert Google Slides, and remove duplicate title
  let updatedContent = updateImagePaths(parsed.content);
  updatedContent = convertGoogleSlidesToComponent(updatedContent);
  updatedContent = removeDuplicateTitle(updatedContent);

  // Reconstruct file
  const output = matter.stringify(updatedContent, transformed);

  // Get filename
  const filename = path.basename(sourcePath);
  const targetPath = path.join(CONFIG.targetRepo, 'content', collectionType, filename);

  // Write file
  await fs.ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, output);

  console.log(`✓ Migrated ${collectionType}/${filename}`);

  return { filename, recordId: transformed.recordId };
}

/**
 * Copy media files for a record
 */
async function copyMediaFiles(recordId, collectionType) {
  if (!recordId) return 0;

  const sourceDir = path.join(CONFIG.sourceRepo, 'public', 'assets', collectionType);
  const targetDir = path.join(CONFIG.targetRepo, 'public', 'uploads', collectionType);

  if (!await fs.pathExists(sourceDir)) return 0;

  const allFiles = await fs.readdir(sourceDir);
  const relatedFiles = allFiles.filter(f => {
    if (!f.startsWith(recordId)) return false;
    // Skip thumbnails
    if (f.includes('_thumbnail_small') || 
        f.includes('_thumbnail_medium') || 
        f.includes('_thumbnail_large')) {
      return false;
    }
    return true;
  });

  await fs.ensureDir(targetDir);

  for (const file of relatedFiles) {
    await fs.copy(
      path.join(sourceDir, file),
      path.join(targetDir, file)
    );
  }

  return relatedFiles.length;
}

/**
 * Copy rubrics data file
 */
async function copyRubrics() {
  const sourceFile = path.join(CONFIG.sourceRepo, 'content', 'data', 'rubrics.json');
  const targetDir = path.join(CONFIG.targetRepo, 'content', 'rubrics');

  if (!await fs.pathExists(sourceFile)) {
    console.log('⚠ rubrics.json not found');
    return;
  }

  const rubrics = await fs.readJson(sourceFile);
  await fs.ensureDir(targetDir);

  // Convert each rubric to a markdown file
  for (const rubric of rubrics) {
    const filename = `${rubric.slug}.md`;
    
    // Clean criteria - remove undefined values
    const cleanCriteria = rubric.criteria ? rubric.criteria.map(c => ({
      id: c.id || '',
      name: c.name || '',
      description: c.description || ''
    })) : [];
    
    const frontmatter = {
      title: rubric.name || rubric.slug,
      slug: rubric.slug,
      description: rubric.description || '',
      criteria: cleanCriteria,
    };
    
    const content = matter.stringify('', frontmatter);

    await fs.writeFile(path.join(targetDir, filename), content);
    console.log(`✓ Created rubric: ${filename}`);
  }
}

/**
 * Main migration function
 */
async function migrateSamples() {
  console.log('='.repeat(60));
  console.log('MIGRATING SAMPLE FILES');
  console.log('='.repeat(60));

  try {
    // 1. Migrate one project
    console.log('\n1. Migrating project: 30-seconds-of-animation.md');
    const projectFile = path.join(CONFIG.sourceRepo, 'content', 'projects', '30-seconds-of-animation.md');
    const project = await migrateFile(projectFile, 'projects');
    
    const projectMedia = await copyMediaFiles(project.recordId, 'projects');
    console.log(`   ✓ Copied ${projectMedia} media files (skipping thumbnails)`);

    // 2. Migrate one lecture
    console.log('\n2. Migrating lecture: introduction-to-animation.md');
    const lectureFile = path.join(CONFIG.sourceRepo, 'content', 'lectures', 'introduction-to-animation.md');
    const lecture = await migrateFile(lectureFile, 'lectures');
    
    const lectureMedia = await copyMediaFiles(lecture.recordId, 'lectures');
    console.log(`   ✓ Copied ${lectureMedia} media files (skipping thumbnails)`);

    // 3. Copy rubrics
    console.log('\n3. Migrating rubrics...');
    await copyRubrics();

    console.log('\n' + '='.repeat(60));
    console.log('✓ SAMPLE MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nMigrated:');
    console.log('  - 1 project (30-seconds-of-animation)');
    console.log('  - 1 lecture (introduction-to-animation)');
    console.log('  - All rubrics');
    console.log('\nNext: Restart dev server and test the pages');

  } catch (error) {
    console.error('\n✗ Error during migration:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

migrateSamples();
