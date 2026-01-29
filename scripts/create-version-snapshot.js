#!/usr/bin/env node

/**
 * Create immutable version snapshots when content is published
 * Run this after publishing new content versions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentTypes = ['exercises', 'tutorials', 'lectures', 'articles', 'projects'];
const rootDir = path.join(__dirname, '..');
const registryPath = path.join(rootDir, 'content/data/version-registry.json');

let snapshotsCreated = 0;
let errors = 0;

console.log('🔄 Creating version snapshots...\n');

// Load or initialize registry
let registry = {};
if (fs.existsSync(registryPath)) {
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    console.log('✓ Loaded existing version registry\n');
  } catch (error) {
    console.warn('⚠️  Failed to load version registry, creating new one\n');
  }
} else {
  console.log('📝 Creating new version registry\n');
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

      // Get current version and previous version from registry
      const currentVersion = frontmatter.version;
      const slug = folder;
      const previousVersion = registry[slug]?.latest;

      // Check if version field is missing
      if (!currentVersion) {
        if (previousVersion) {
          console.log(`   ⚠️  ${folder}/index.md - Version field removed (was ${previousVersion}), please restore it`);
        } else {
          console.log(`   ⊘ ${folder}/index.md - No version field, skipping`);
        }
        return;
      }

      // Check if version has changed from registry
      if (previousVersion && previousVersion === currentVersion) {
        console.log(`   − ${folder}/index.md v${currentVersion} (no version change detected)`);
        return;
      }

      const versionDir = path.join(typeDir, folder, 'v');
      
      // Determine which version to snapshot (previous or default 0.0.1 for new content)
      const versionToSnapshot = previousVersion || '0.0.1';

      // If there's a version change (or new content with version), archive the previous version
      if (!previousVersion || (previousVersion && previousVersion !== currentVersion)) {
        const snapshotFileName = `${versionToSnapshot}.md`;
        const snapshotPath = path.join(versionDir, snapshotFileName);


        // Check if snapshot of previous version already exists
        if (!fs.existsSync(snapshotPath)) {
          // Create v/ directory if it doesn't exist
          if (!fs.existsSync(versionDir)) {
            fs.mkdirSync(versionDir, { recursive: true });
          }

          // Create snapshot with modified frontmatter (archiving the previous version)
          const snapshotFrontmatter = {
            ...frontmatter,
            version: versionToSnapshot,
            versionStatus: 'archived',
            publishEmbed: true,
            _snapshotCreatedAt: new Date().toISOString(),
            _snapshotFrom: 'index.md'
          };

          const snapshotContent = matter.stringify(markdown, snapshotFrontmatter);
          fs.writeFileSync(snapshotPath, snapshotContent, 'utf-8');

          const actionText = previousVersion 
            ? `archived previous version` 
            : `initialized with default version`;
          console.log(`   ✓ ${folder}/index.md v${currentVersion} → v/${snapshotFileName} (${actionText})`);
          snapshotsCreated++;

          // Update registry with archived version
          if (!registry[slug]) {
            registry[slug] = {
              latest: currentVersion,
              versions: {}
            };
          }

          registry[slug].versions[versionToSnapshot] = {
            publishedAt: new Date().toISOString(),
            status: 'archived',
            changelog: frontmatter.changelog || '',
            breakingChanges: frontmatter.breakingChanges || []
          };
        }
      }

      // Update registry with new latest version
      if (!registry[slug]) {
        registry[slug] = {
          latest: currentVersion,
          versions: {}
        };
      }

      registry[slug].latest = currentVersion;
      registry[slug].versions[currentVersion] = {
        publishedAt: new Date().toISOString(),
        status: 'latest',
        changelog: frontmatter.changelog || '',
        breakingChanges: frontmatter.breakingChanges || []
      };

      console.log(`   ✓ ${folder}/index.md v${currentVersion} (new latest)`);


    } catch (error) {
      console.error(`   ✗ ${folder}/index.md - Error: ${error.message}`);
      errors++;
    }
  });

  console.log('');
}

// Save registry
try {
  const registryDir = path.dirname(registryPath);
  if (!fs.existsSync(registryDir)) {
    fs.mkdirSync(registryDir, { recursive: true });
  }
  
  fs.writeFileSync(
    registryPath, 
    JSON.stringify(registry, null, 2),
    'utf-8'
  );
  console.log('✓ Updated version registry\n');
} catch (error) {
  console.error(`✗ Failed to save registry: ${error.message}\n`);
  errors++;
}

// Summary
console.log('='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log(`✓ Snapshots created: ${snapshotsCreated}`);
console.log(`✗ Errors: ${errors}`);
console.log('='.repeat(60));

if (snapshotsCreated > 0) {
  console.log('\n💡 Next steps:');
  console.log('   1. Review the created snapshot files');
  console.log('   2. Commit them to git');
  console.log('   3. Push to trigger deployment');
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
