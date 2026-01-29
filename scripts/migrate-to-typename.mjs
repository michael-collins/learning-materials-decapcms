import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lessonsDir = path.join(__dirname, '../content/lessons');

console.log('🔄 Migrating items to typed list format with __typename...\n');

let totalUpdated = 0;

// Walk through all lesson folders
const lessonFolders = fs.readdirSync(lessonsDir).filter(file => {
  const stat = fs.statSync(path.join(lessonsDir, file));
  return stat.isDirectory();
});

for (const folder of lessonFolders) {
  const indexPath = path.join(lessonsDir, folder, 'index.md');
  
  if (!fs.existsSync(indexPath)) continue;
  
  const content = fs.readFileSync(indexPath, 'utf8');
  const { data, content: body } = matter(content);
  
  let updated = false;
  
  if (data.items && Array.isArray(data.items)) {
    const migratedItems = data.items.map(item => {
      if (item.type) {
        // Replace 'type' with '__typename'
        const itemType = item.type;
        delete item.type;
        item.__typename = itemType;
        updated = true;
      }
      return item;
    });
    
    data.items = migratedItems;
  }
  
  if (updated) {
    const newContent = matter.stringify(body, data);
    fs.writeFileSync(indexPath, newContent, 'utf8');
    console.log(`✓ Updated: ${folder}`);
    totalUpdated++;
  }
}

console.log(`\n✅ Migration complete! Updated ${totalUpdated} lessons`);
