#!/usr/bin/env node

/**
 * Migration Script: Frontmatter Refactor Phase 1 (v2)
 * Adds lessons arrays to specializations while preserving YAML formatting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.join(__dirname, '../content');
const lessonsDir = path.join(contentDir, 'lessons');
const specializationsDir = path.join(contentDir, 'specializations');

const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  debug: (msg) => process.argv.includes('--verbose') && console.log(`🔍 ${msg}`)
};

function readLessons() {
  const lessons = {};
  const lessonFiles = fs.readdirSync(lessonsDir);

  for (const dir of lessonFiles) {
    const lessonPath = path.join(lessonsDir, dir, 'index.md');
    if (!fs.existsSync(lessonPath)) continue;

    try {
      const content = fs.readFileSync(lessonPath, 'utf-8');
      const { data } = matter(content);

      if (data.slug) {
        lessons[data.slug] = {
          title: data.title,
          specialization: data.specialization,
          order: data.order || 999
        };
        logger.debug(`Found: ${data.slug} -> ${data.specialization}`);
      }
    } catch (err) {
      logger.error(`Failed to read ${lessonPath}: ${err.message}`);
    }
  }

  return lessons;
}

function buildLessonMapping(lessons) {
  const mapping = {};

  for (const [lessonSlug, lessonData] of Object.entries(lessons)) {
    if (!lessonData.specialization) continue;

    const specSlug = lessonData.specialization;
    if (!mapping[specSlug]) mapping[specSlug] = [];

    mapping[specSlug].push({
      slug: lessonSlug,
      order: lessonData.order
    });
  }

  for (const lessonsArray of Object.values(mapping)) {
    lessonsArray.sort((a, b) => a.order - b.order);
  }

  return mapping;
}

function formatLessonsYAML(lessonSlugs) {
  if (lessonSlugs.length === 0) return 'lessons: []';
  return `lessons:\n${lessonSlugs.map(slug => `  - ${slug}`).join('\n')}`;
}

function updateSpecializationFile(spec, lessonSlugs) {
  const lines = spec.raw.split('\n');
  let frontmatterStart = -1;
  let frontmatterEnd = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '---') {
      if (frontmatterStart === -1) {
        frontmatterStart = i;
      } else {
        frontmatterEnd = i;
        break;
      }
    }
  }

  if (frontmatterStart === -1 || frontmatterEnd === -1) {
    throw new Error('Could not find frontmatter');
  }

  const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
  const contentLines = lines.slice(frontmatterEnd + 1);

  // Check if lessons field already exists
  const lessonsLineIndex = frontmatterLines.findIndex(line => line.startsWith('lessons:'));
  
  let newFrontmatterLines;
  if (lessonsLineIndex !== -1) {
    // Replace existing
    let endIndex = lessonsLineIndex + 1;
    while (endIndex < frontmatterLines.length && frontmatterLines[endIndex].startsWith('  ')) {
      endIndex++;
    }
    
    const newLessonsYAML = formatLessonsYAML(lessonSlugs);
    newFrontmatterLines = [
      ...frontmatterLines.slice(0, lessonsLineIndex),
      newLessonsYAML,
      ...frontmatterLines.slice(endIndex)
    ];
  } else {
    // Insert before 'published'
    let insertIndex = frontmatterLines.length;
    const publishedIndex = frontmatterLines.findIndex(line => line.startsWith('published:'));
    if (publishedIndex !== -1) insertIndex = publishedIndex;
    
    const newLessonsYAML = formatLessonsYAML(lessonSlugs);
    newFrontmatterLines = [
      ...frontmatterLines.slice(0, insertIndex),
      newLessonsYAML,
      ...frontmatterLines.slice(insertIndex)
    ];
  }

  return ['---', ...newFrontmatterLines, '---', ...contentLines].join('\n');
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  try {
    logger.info('Starting Frontmatter Refactor - Phase 1 (v2)');
    if (dryRun) logger.warn('DRY RUN mode\n');

    logger.info('Reading lessons...');
    const lessons = readLessons();
    logger.success(`Found ${Object.keys(lessons).length} lessons\n`);

    logger.info('Building mapping...');
    const mapping = buildLessonMapping(lessons);
    logger.success(`Mapped to ${Object.keys(mapping).length} specializations\n`);

    logger.info('Updating specializations...\n');
    
    const report = { updated: [], unchanged: [], errors: [] };

    for (const [specSlug, lessonArray] of Object.entries(mapping)) {
      try {
        // Only update index.md (NOT versioned files - they are immutable snapshots)
        const specPath = path.join(specializationsDir, specSlug, 'index.md');
        
        if (!fs.existsSync(specPath)) {
          report.errors.push({ slug: specSlug, error: 'File not found' });
          continue;
        }

        const raw = fs.readFileSync(specPath, 'utf-8');
        const { data } = matter(raw);
        
        const lessonSlugs = lessonArray.map(l => l.slug);
        const currentSlugs = (data.lessons || []).map(l => typeof l === 'string' ? l : l.slug);
        
        if (JSON.stringify(currentSlugs) === JSON.stringify(lessonSlugs)) {
          logger.debug(`"${specSlug}" already correct`);
          report.unchanged.push({ slug: specSlug, lessonCount: lessonSlugs.length });
          continue;
        }

        const newContent = updateSpecializationFile({ raw }, lessonSlugs);

        if (!dryRun) {
          fs.writeFileSync(specPath, newContent);
        }

        logger.success(`Updated "${specSlug}" (${lessonSlugs.length} lessons)`);
        report.updated.push({ slug: specSlug, lessonCount: lessonSlugs.length });
      } catch (err) {
        logger.error(`Failed to update "${specSlug}": ${err.message}`);
        report.errors.push({ slug: specSlug, error: err.message });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION REPORT');
    console.log('='.repeat(60) + '\n');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTION'}\n`);
    console.log('📊 SUMMARY:');
    console.log(`  • Updated: ${report.updated.length}`);
    console.log(`  • Unchanged: ${report.unchanged.length}`);
    console.log(`  • Errors: ${report.errors.length}\n`);

    if (report.updated.length > 0) {
      console.log('✅ UPDATED:');
      for (const item of report.updated) {
        console.log(`  • ${item.slug} (${item.lessonCount} lessons)`);
      }
      console.log();
    }

    if (report.errors.length > 0) {
      console.log('❌ ERRORS:');
      for (const err of report.errors) {
        console.log(`  • ${err.slug}: ${err.error}`);
      }
    }

    console.log('='.repeat(60) + '\n');
  } catch (err) {
    logger.error(`Failed: ${err.message}`);
    process.exit(1);
  }
}

main();
