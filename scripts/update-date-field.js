import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const newDate = '2026-01-12T12:00:00.000Z';

// Content types to update
const contentTypes = [
  'exercises',
  'projects',
  'lectures',
  'lessons',
  'specializations',
  'pathways'
];

let filesUpdated = 0;
let filesSkipped = 0;

contentTypes.forEach(contentType => {
  const pattern = path.join(__dirname, '..', 'content', contentType, '**', 'index.md');
  const files = glob.sync(pattern);
  
  console.log(`\nProcessing ${contentType}: ${files.length} files`);
  
  files.forEach(filePath => {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check if date field exists
      const dateMatch = content.match(/^date:\s*(.+)$/m);
      if (!dateMatch) {
        console.log(`  ⏭️  Skipped (no date field): ${path.basename(path.dirname(filePath))}`);
        filesSkipped++;
        return;
      }
      
      const currentDate = dateMatch[1].trim();
      
      // Skip if already has the new date
      if (currentDate === newDate || currentDate.startsWith(newDate)) {
        console.log(`  ⏭️  Skipped (already has new date): ${path.basename(path.dirname(filePath))}`);
        filesSkipped++;
        return;
      }
      
      // Replace the date
      const newContent = content.replace(
        /^date:\s*.+$/m,
        `date: ${newDate}`
      );
      
      // Write the file back
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`  ✅ Updated: ${path.basename(path.dirname(filePath))} (${currentDate} → ${newDate})`);
      filesUpdated++;
      
    } catch (error) {
      console.error(`  ❌ Error processing ${filePath}:`, error.message);
    }
  });
});

console.log(`\n\n📊 Summary:`);
console.log(`   Files updated: ${filesUpdated}`);
console.log(`   Files skipped: ${filesSkipped}`);
console.log(`   Total processed: ${filesUpdated + filesSkipped}`);
