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

      // Only create snapshot if version is set
      if (!frontmatter.version) {
        console.log(`   ⊘ ${folder}/index.md - No version field, skipping`);
        return;
      }

      const version = frontmatter.version;
      const slug = folder;
      const versionDir = path.join(typeDir, folder, 'v');
      const snapshotFileName = `${version}.md`;
      const snapshotPath = path.join(versionDir, snapshotFileName);

      // Check if snapshot already exists
      if (fs.existsSync(snapshotPath)) {
        console.log(`   − ${folder}/index.md → v/${snapshotFileName} (already exists)`);
        return;
      }

      // Create v/ directory if it doesn't exist
      if (!fs.existsSync(versionDir)) {
        fs.mkdirSync(versionDir, { recursive: true });
      }

      // Create snapshot with modified frontmatter
      const snapshotFrontmatter = {
        ...frontmatter,
        versionStatus: 'archived',
        publishEmbed: true,
        _snapshotCreatedAt: new Date().toISOString(),
        _snapshotFrom: 'index.md'
      };

      const snapshotContent = matter.stringify(markdown, snapshotFrontmatter);
      fs.writeFileSync(snapshotPath, snapshotContent, 'utf-8');

      console.log(`   ✓ ${folder}/index.md → v/${snapshotFileName}`);
      snapshotsCreated++;

      // Update registry
      if (!registry[slug]) {
        registry[slug] = {
          latest: version,
          versions: {}
        };
      }

      registry[slug].versions[version] = {
        publishedAt: new Date().toISOString(),
        status: 'archived',
        changelog: frontmatter.changelog || '',
        breakingChanges: frontmatter.breakingChanges || []
      };

      // Update latest version
      const existingLatest = registry[slug].latest;
      if (compareVersions(version, existingLatest) > 0) {
        registry[slug].latest = version;
      }

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
