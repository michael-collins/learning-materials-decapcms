#!/usr/bin/env node

/**
 * Validation Script: Frontmatter Refactor Phase 1
 * Validates the migration and checks for data integrity issues
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
  error: (msg) => console.error(`❌ ${msg}`)
};

const results = {
  issues: [],
  warnings: [],
  stats: {
    lessonsValidated: 0,
    specializationsValidated: 0,
    orphanedLessons: [],
    missingLessonReferences: [],
    invalidLessonSlugs: [],
    lessonsWithoutSpecialization: [],
    specializationsWithMissingLessons: []
  }
};

/**
 * Read all lesson files
 */
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
      }
    } catch (err) {
      results.issues.push(`Failed to read lesson ${lessonPath}: ${err.message}`);
    }
  }

  return lessons;
}

/**
 * Read all specialization files
 */
function readSpecializations() {
  const specializations = {};
  const specFiles = fs.readdirSync(specializationsDir);

  for (const dir of specFiles) {
    const specPath = path.join(specializationsDir, dir, 'index.md');
    if (!fs.existsSync(specPath)) continue;

    try {
      const content = fs.readFileSync(specPath, 'utf-8');
      const { data } = matter(content);

      if (data.slug) {
        specializations[data.slug] = {
          title: data.title,
          lessons: data.lessons || []
        };
      }
    } catch (err) {
      results.issues.push(`Failed to read specialization ${specPath}: ${err.message}`);
    }
  }

  return specializations;
}

/**
 * Validate lessons
 */
function validateLessons(lessons, specializations) {
  logger.info('Validating lessons...\n');

  const specializationSlugs = Object.keys(specializations);

  for (const [lessonSlug, lesson] of Object.entries(lessons)) {
    results.stats.lessonsValidated++;

    // Check if lesson has specialization
    if (!lesson.specialization) {
      results.stats.lessonsWithoutSpecialization.push(lessonSlug);
      results.warnings.push(`Lesson "${lessonSlug}" has no specialization assigned`);
    } else if (!specializationSlugs.includes(lesson.specialization)) {
      // Check if specialization exists
      results.issues.push(
        `Lesson "${lessonSlug}" references non-existent specialization "${lesson.specialization}"`
      );
    }
  }
}

/**
 * Validate specializations
 */
function validateSpecializations(specializations, lessons) {
  logger.info('Validating specializations...\n');

  const lessonSlugs = Object.keys(lessons);

  for (const [specSlug, spec] of Object.entries(specializations)) {
    results.stats.specializationsValidated++;

    if (!spec.lessons || spec.lessons.length === 0) {
      // This is okay - specialization might not have lessons
      continue;
    }

    for (const lessonRef of spec.lessons) {
      const lessonSlug = typeof lessonRef === 'string' ? lessonRef : lessonRef.slug;

      // Check if lesson exists
      if (!lessonSlugs.includes(lessonSlug)) {
        results.issues.push(
          `Specialization "${specSlug}" references non-existent lesson "${lessonSlug}"`
        );
        results.stats.invalidLessonSlugs.push({
          spec: specSlug,
          lesson: lessonSlug
        });
      } else {
        // Verify the lesson actually belongs to this specialization
        const lesson = lessons[lessonSlug];
        if (lesson.specialization && lesson.specialization !== specSlug) {
          results.issues.push(
            `Lesson "${lessonSlug}" in specialization "${specSlug}" actually belongs to "${lesson.specialization}"`
          );
          results.stats.missingLessonReferences.push({
            lesson: lessonSlug,
            expectedSpec: lesson.specialization,
            foundIn: specSlug
          });
        }
      }
    }
  }
}

/**
 * Check for orphaned lessons
 */
function checkOrphanedLessons(lessons, specializations) {
  logger.info('Checking for orphaned lessons...\n');

  const mappedLessons = new Set();

  // Collect all lessons referenced in specializations
  for (const spec of Object.values(specializations)) {
    for (const lessonRef of spec.lessons || []) {
      const lessonSlug = typeof lessonRef === 'string' ? lessonRef : lessonRef.slug;
      mappedLessons.add(lessonSlug);
    }
  }

  // Find lessons not in any specialization's lessons array
  for (const lessonSlug of Object.keys(lessons)) {
    if (!mappedLessons.has(lessonSlug)) {
      // Check if lesson has specialization field (fallback)
      const lesson = lessons[lessonSlug];
      if (!lesson.specialization) {
        results.stats.orphanedLessons.push(lessonSlug);
        results.warnings.push(
          `Lesson "${lessonSlug}" is not referenced in any specialization's lessons array`
        );
      }
    }
  }
}

/**
 * Verify lesson order consistency
 */
function verifyLessonOrdering(lessons, specializations) {
  logger.info('Verifying lesson order consistency...\n');

  for (const [specSlug, spec] of Object.entries(specializations)) {
    if (!spec.lessons || spec.lessons.length === 0) continue;

    for (let i = 0; i < spec.lessons.length; i++) {
      const lessonRef = spec.lessons[i];
      const lessonSlug = typeof lessonRef === 'string' ? lessonRef : lessonRef.slug;

      if (lessons[lessonSlug]) {
        const lesson = lessons[lessonSlug];
        const expectedOrder = i + 1;

        // Check if order field matches position in array
        if (lesson.order && lesson.order !== expectedOrder) {
          results.warnings.push(
            `Lesson "${lessonSlug}" in "${specSlug}" has order ${lesson.order} but is at position ${expectedOrder}`
          );
        }
      }
    }
  }
}

/**
 * Generate validation report
 */
function generateReport() {
  console.log('\n' + '='.repeat(70));
  console.log('VALIDATION REPORT - Frontmatter Refactor Phase 1');
  console.log('='.repeat(70) + '\n');

  console.log('📊 VALIDATION STATISTICS:');
  console.log(`  • Lessons Validated: ${results.stats.lessonsValidated}`);
  console.log(`  • Specializations Validated: ${results.stats.specializationsValidated}`);
  console.log();

  const hasIssues = results.issues.length > 0;
  const hasWarnings = results.warnings.length > 0;

  if (!hasIssues && !hasWarnings) {
    console.log('✅ VALIDATION PASSED - No issues found!\n');
    console.log('='.repeat(70) + '\n');
    return true;
  }

  if (hasIssues) {
    console.log(`❌ CRITICAL ISSUES (${results.issues.length}):`);
    for (const issue of results.issues) {
      console.log(`  • ${issue}`);
    }
    console.log();
  }

  if (hasWarnings) {
    console.log(`⚠️  WARNINGS (${results.warnings.length}):`);
    for (const warning of results.warnings) {
      console.log(`  • ${warning}`);
    }
    console.log();
  }

  if (results.stats.orphanedLessons.length > 0) {
    console.log(`🚨 ORPHANED LESSONS (${results.stats.orphanedLessons.length}):`);
    for (const lesson of results.stats.orphanedLessons) {
      console.log(`  • ${lesson}`);
    }
    console.log();
  }

  if (results.stats.lessonsWithoutSpecialization.length > 0) {
    console.log(`⚠️  LESSONS WITHOUT SPECIALIZATION (${results.stats.lessonsWithoutSpecialization.length}):`);
    for (const lesson of results.stats.lessonsWithoutSpecialization) {
      console.log(`  • ${lesson}`);
    }
    console.log();
  }

  if (results.stats.invalidLessonSlugs.length > 0) {
    console.log(`🚨 INVALID LESSON REFERENCES (${results.stats.invalidLessonSlugs.length}):`);
    for (const ref of results.stats.invalidLessonSlugs) {
      console.log(`  • Specialization "${ref.spec}" references non-existent lesson "${ref.lesson}"`);
    }
    console.log();
  }

  if (results.stats.missingLessonReferences.length > 0) {
    console.log(`🚨 MISMATCHED LESSON REFERENCES (${results.stats.missingLessonReferences.length}):`);
    for (const ref of results.stats.missingLessonReferences) {
      console.log(
        `  • Lesson "${ref.lesson}" belongs to "${ref.expectedSpec}" but found in "${ref.foundIn}"`
      );
    }
    console.log();
  }

  console.log('='.repeat(70) + '\n');
  return !hasIssues;
}

/**
 * Main execution
 */
async function main() {
  try {
    logger.info('Starting Validation - Frontmatter Refactor Phase 1\n');

    // Step 1: Read data
    logger.info('Reading lesson files...');
    const lessons = readLessons();
    logger.success(`Found ${Object.keys(lessons).length} lessons\n`);

    logger.info('Reading specialization files...');
    const specializations = readSpecializations();
    logger.success(`Found ${Object.keys(specializations).length} specializations\n`);

    // Step 2: Validate
    validateLessons(lessons, specializations);
    validateSpecializations(specializations, lessons);
    checkOrphanedLessons(lessons, specializations);
    verifyLessonOrdering(lessons, specializations);

    // Step 3: Report
    const isValid = generateReport();

    process.exit(isValid ? 0 : 1);
  } catch (err) {
    logger.error(`Validation failed: ${err.message}`);
    process.exit(1);
  }
}

main();
