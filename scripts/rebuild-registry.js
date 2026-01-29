#!/usr/bin/env node

/**
 * Rebuild version registry from actual files on disk
 * Scans all index.md and v/*.md files and reconstructs the registry
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

let registry = {};
let itemsProcessed = 0;
let versionsFound = 0;

// Load existing registry to preserve timestamps
let existingRegistry = {};
if (fs.existsSync(registryPath)) {
  try {
    existingRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  } catch (error) {
    console.warn('⚠️  Could not load existing registry, timestamps will be reset\n');
  }
}

console.log('🔄 Rebuilding version registry from files...\n');

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

  console.log(`📁 Processing ${type}...`);

  contentFolders.forEach(folder => {
    const indexPath = path.join(typeDir, folder, 'index.md');
    const versionDir = path.join(typeDir, folder, 'v');
    
    if (!fs.existsSync(indexPath)) {
      return;
    }

    const slug = folder;
    const versions = {};
    let latestVersion = null;
    let latestStatus = null;

    try {
      // Read index.md (latest version)
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      const { data: indexFrontmatter } = matter(indexContent);
      const indexVersion = indexFrontmatter.version;

      if (indexVersion) {
        latestVersion = indexVersion;
        latestStatus = indexFrontmatter.versionStatus || 'latest';
        
        // Preserve existing timestamp if available, otherwise use current time
        const existingTimestamp = existingRegistry[slug]?.versions?.[indexVersion]?.publishedAt;
        
        versions[indexVersion] = {
          publishedAt: existingTimestamp || new Date().toISOString(),
          status: latestStatus,
          changelog: indexFrontmatter.changelog || '',
          breakingChanges: indexFrontmatter.breakingChanges || []
        };
        versionsFound++;
      }

      // Read all v/*.md files
      if (fs.existsSync(versionDir)) {
        const versionFiles = fs.readdirSync(versionDir).filter(f => f.endsWith('.md'));
        
        versionFiles.forEach(vFile => {
          const vPath = path.join(versionDir, vFile);
          try {
            const vContent = fs.readFileSync(vPath, 'utf-8');
            const { data: vFrontmatter } = matter(vContent);
            const vVersion = vFrontmatter.version;

            if (vVersion && vVersion !== indexVersion) {
              // Preserve existing timestamp if available, otherwise use current time
              const existingTimestamp = existingRegistry[slug]?.versions?.[vVersion]?.publishedAt;
              
              versions[vVersion] = {
                publishedAt: existingTimestamp || new Date().toISOString(),
                status: 'archived',
                changelog: vFrontmatter.changelog || '',
                breakingChanges: vFrontmatter.breakingChanges || []
              };
              versionsFound++;
            }
          } catch (error) {
            console.error(`   ✗ Error reading ${vFile}: ${error.message}`);
          }
        });
      }

      // Add to registry if we found versions
      if (latestVersion) {
        registry[slug] = {
          latest: latestVersion,
          versions
        };
        itemsProcessed++;
        console.log(`   ✓ ${folder} (latest: ${latestVersion}, versions: ${Object.keys(versions).length})`);
      } else {
        console.log(`   ⊘ ${folder} (no version field)`);
      }

    } catch (error) {
      console.error(`   ✗ ${folder} - Error: ${error.message}`);
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
  
  console.log('\n✅ Registry rebuilt successfully!\n');
  console.log(`📊 Summary:`);
  console.log(`   Items processed: ${itemsProcessed}`);
  console.log(`   Total versions found: ${versionsFound}`);
  console.log(`   Registry entries: ${Object.keys(registry).length}`);
  
} catch (error) {
  console.error('✗ Failed to save registry:', error.message);
  process.exit(1);
}
