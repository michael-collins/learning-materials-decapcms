import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.join(__dirname, '../content');

const COLLECTIONS = ['exercises', 'projects', 'lessons', 'lectures', 'articles', 'tutorials'];
const VERSION = '1.0.0';

function getDirectories(dirPath) {
  try {
    return fs.readdirSync(dirPath).filter(file => {
      const fullPath = path.join(dirPath, file);
      return fs.statSync(fullPath).isDirectory();
    });
  } catch (err) {
    return [];
  }
}

function processCollection(collectionName) {
  const collectionPath = path.join(contentDir, collectionName);
  
  if (!fs.existsSync(collectionPath)) {
    console.log(`⚠️  ${collectionName} directory not found`);
    return;
  }

  const subdirs = getDirectories(collectionPath);
  let processedCount = 0;

  subdirs.forEach(subdir => {
    const contentPath = path.join(collectionPath, subdir);
    const indexPath = path.join(contentPath, 'index.md');

    // Skip if already has a v folder
    const vFolderPath = path.join(contentPath, 'v');
    if (fs.existsSync(vFolderPath)) {
      console.log(`ℹ️  ${collectionName}/${subdir} already has v folder, skipping`);
      return;
    }

    if (fs.existsSync(indexPath)) {
      try {
        // Create v folder
        if (!fs.existsSync(vFolderPath)) {
          fs.mkdirSync(vFolderPath, { recursive: true });
        }

        // Copy index.md to v/1.0.0.md
        const archivePath = path.join(vFolderPath, `${VERSION}.md`);
        fs.copyFileSync(indexPath, archivePath);
        
        console.log(`✅ ${collectionName}/${subdir}: Created v/${VERSION}.md`);
        processedCount++;
      } catch (err) {
        console.error(`❌ Error processing ${collectionName}/${subdir}:`, err.message);
      }
    }
  });

  console.log(`📊 ${collectionName}: ${processedCount} items versioned\n`);
}

console.log('🚀 Creating archive v1.0.0 with correct /v/{version} path structure...\n');

COLLECTIONS.forEach(collection => {
  processCollection(collection);
});

console.log('✨ Archive versioning complete!');
