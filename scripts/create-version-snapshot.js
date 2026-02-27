#!/usr/bin/env node

/**
 * Create immutable version snapshots when content is published
 * Uses git history to create snapshots of the previous version
 * 
 * Usage:
 *   node scripts/create-version-snapshot.js           # Normal mode - creates files
 *   node scripts/create-version-snapshot.js --dry-run # Test mode - shows what would be created
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentTypes = ['exercises', 'tutorials', 'lectures', 'articles', 'projects', 'lessons', 'pathways', 'specializations'];
const rootDir = path.join(__dirname, '..');

// Check for dry-run mode
const isDryRun = process.argv.includes('--dry-run');

let snapshotsCreated = 0;
let errors = 0;

if (isDryRun) {
  console.log('🧪 DRY RUN MODE - No files will be created\n');
} else {
  console.log('🔄 Creating version snapshots from git history...\n');
}

// Process each content type
for (const type of contentTypes) {
  const typeDir = path.join(rootDir, 'content', type);
  
  if (!fs.existsSync(typeDir)) {
    continue;
  }

  // Read subdirectories (each content item folder)
  const contentFolders = fs.readdirSync(typeDir).filter(f => {
    const itemPath = path.join(typeDir, f);
    return fs.statSync(itemPath).isDirectory();
  });

  if (contentFolders.length === 0) {
    continue;
  }

  console.log(`📁 ${type}:`);

  contentFolders.forEach(folder => {
    const indexPath = path.join(typeDir, folder, 'index.md');
    
    if (!fs.existsSync(indexPath)) {
      return;
    }
    
    try {
      const content = fs.readFileSync(indexPath, 'utf-8');
      const { data: frontmatter, content: markdown } = matter(content);

      // Get current version from index.md
      const currentVersion = frontmatter.version;
      const slug = folder;

      // Check if version field is missing
      if (!currentVersion) {
        console.log(`   ⊘ ${folder}/index.md - No version field, skipping`);
        return;
      }

      // Get the previous version of this file from git history
      const relativeIndexPath = path.relative(rootDir, indexPath);
      let oldContent, oldVersion;
      
      try {
        // Get file content from previous commit (HEAD~1)
        oldContent = execSync(`git show HEAD~1:"${relativeIndexPath}"`, { 
          encoding: 'utf-8',
          cwd: rootDir 
        });
        
        const { data: oldFrontmatter } = matter(oldContent);
        oldVersion = oldFrontmatter.version;
      } catch (error) {
        // File might be new or git command failed
        console.log(`   ⊘ ${folder}/index.md v${currentVersion} (no git history or new file)`);
        return;
      }

      // Check if version actually changed
      if (!oldVersion || oldVersion === currentVersion) {
        console.log(`   − ${folder}/index.md v${currentVersion} (no version change)`);
        return;
      }

      const versionDir = path.join(typeDir, folder, 'v');
      const snapshotFileName = `${oldVersion}.md`;
      const snapshotPath = path.join(versionDir, snapshotFileName);

      // Check if snapshot already exists
      if (fs.existsSync(snapshotPath)) {
        console.log(`   − ${folder}/index.md v${oldVersion} → v${currentVersion} (snapshot already exists)`);
        return;
      }

      // Parse the old content to modify frontmatter
      const { data: oldFrontmatter, content: oldMarkdown } = matter(oldContent);

      // Create snapshot with modified frontmatter (mark as archived)
      const snapshotFrontmatter = {
        ...oldFrontmatter,
        version: oldVersion,
        versionStatus: 'archived',
        _snapshotCreatedAt: new Date().toISOString(),
        _snapshotFrom: 'git:HEAD~1'
      };

      const snapshotContent = matter.stringify(oldMarkdown, snapshotFrontmatter);

      if (isDryRun) {
        // Dry run - just report what would be created
        console.log(`   ✓ ${folder}/index.md v${oldVersion} → v${currentVersion} (would create: v/${snapshotFileName})`);
        snapshotsCreated++;
      } else {
        // Create v/ directory if it doesn't exist
        if (!fs.existsSync(versionDir)) {
          fs.mkdirSync(versionDir, { recursive: true });
        }

        // Write snapshot file
        fs.writeFileSync(snapshotPath, snapshotContent, 'utf-8');
        console.log(`   ✓ ${folder}/index.md v${oldVersion} → v${currentVersion} (created snapshot from git history)`);
        snapshotsCreated++;
      }

    } catch (error) {
      console.error(`   ✗ ${folder}/index.md - Error: ${error.message}`);
      errors++;
    }
  });

  console.log('');
}

// Summary
console.log('='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log(`✓ Snapshots ${isDryRun ? 'would be' : ''} created: ${snapshotsCreated}`);
console.log(`✗ Errors: ${errors}`);
console.log('='.repeat(60));

if (snapshotsCreated > 0) {
  if (isDryRun) {
    console.log('\n✅ Dry run successful!');
    console.log('The script will create these snapshots when run normally.');
  } else {
    console.log('\n💡 Next steps:');
    console.log('   1. Review the created snapshot files');
    console.log('   2. These will be committed automatically by GitHub Actions');
  }
} else {
  console.log(`\nℹ No version bumps detected - no snapshots ${isDryRun ? 'would be' : ''} created`);
}

process.exit(errors > 0 ? 1 : 0);

/**
 * Compare semantic versions
 */
function compareVersions(v1, v2) {
  const parse = (v) => {
    const match = v.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) return { major: 0, minor: 0, patch: 0 };
    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3])
    };
  };

  const p1 = parse(v1);
  const p2 = parse(v2);

  if (p1.major !== p2.major) return p1.major > p2.major ? 1 : -1;
  if (p1.minor !== p2.minor) return p1.minor > p2.minor ? 1 : -1;
  if (p1.patch !== p2.patch) return p1.patch > p2.patch ? 1 : -1;

  return 0;
}
