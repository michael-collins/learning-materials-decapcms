import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lessonsDir = path.join(__dirname, '../content/lessons');

console.log('🔄 Migrating items from slug format to relation format...\n');

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
      if (item.type && item.slug) {
        // Convert from { type, slug, title? } to { type, [type]: slug }
        const migratedItem = {
          type: item.type
        };
        
        // Map the old slug to the appropriate relation field
        switch (item.type) {
          case 'lectures':
            migratedItem.lecture = item.slug;
            break;
          case 'tutorials':
            migratedItem.tutorial = item.slug;
            break;
          case 'exercises':
            migratedItem.exercise = item.slug;
            break;
          case 'articles':
            migratedItem.article = item.slug;
            break;
          case 'projects':
            migratedItem.project = item.slug;
            break;
        }
        
        return migratedItem;
      }
      return item;
    });
    
    data.items = migratedItems;
    updated = true;
  }
  
  if (updated) {
    const newContent = matter.stringify(body, data);
    fs.writeFileSync(indexPath, newContent, 'utf8');
    console.log(`✓ Updated: ${folder}`);
    totalUpdated++;
  }
}

console.log(`\n✅ Migration complete! Updated ${totalUpdated} lessons`);
