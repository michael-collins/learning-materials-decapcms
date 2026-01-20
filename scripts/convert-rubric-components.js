import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.join(__dirname, '../content');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let changes = [];

  // Pattern to match: ::rubric-component{id="..."}[\n]::
  const rubricPattern = /::rubric-component\{id="([^"]+)"\}\s*\n::/g;
  
  const matches = [...content.matchAll(rubricPattern)];
  if (matches.length > 0) {
    matches.forEach(match => {
      changes.push(`  - Removed closing :: from rubric-component{id="${match[1]}"}`);
    });
    // Replace with just the opening tag (no closing ::)
    content = content.replace(rubricPattern, '::rubric-component{id="$1"}');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${path.relative(contentDir, filePath)}`);
    changes.forEach(change => console.log(change));
  }

  return modified;
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalModified = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      totalModified += walkDirectory(filePath);
    } else if (file.endsWith('.md')) {
      if (processFile(filePath)) {
        totalModified++;
      }
    }
  });

  return totalModified;
}

console.log('🔄 Converting rubric components...\n');
const modified = walkDirectory(contentDir);
console.log(`\n✨ Done! Modified ${modified} file(s).`);
