import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const date = '2024-01-16';

// Content types to update (skip articles and tutorials as they already have dates)
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
      
      // Check if date field already exists
      if (content.match(/^date:\s*.+$/m)) {
        console.log(`  ⏭️  Skipped (already has date): ${path.basename(path.dirname(filePath))}`);
        filesSkipped++;
        return;
      }
      
      // Find the frontmatter section
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        console.log(`  ⚠️  No frontmatter found: ${path.basename(path.dirname(filePath))}`);
        filesSkipped++;
        return;
      }
      
      const frontmatter = frontmatterMatch[1];
      
      // Add date field after the title (or at the end of frontmatter)
      let newFrontmatter;
      if (frontmatter.match(/^title:/m)) {
        // Add after title
        newFrontmatter = frontmatter.replace(
          /(^title:\s*.+$)/m,
          `$1\ndate: ${date}`
        );
      } else {
        // Add at the end
        newFrontmatter = frontmatter + `\ndate: ${date}`;
      }
      
      // Replace the frontmatter in the content
      const newContent = content.replace(
        /^---\n[\s\S]*?\n---/,
        `---\n${newFrontmatter}\n---`
      );
      
      // Write the file back
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`  ✅ Updated: ${path.basename(path.dirname(filePath))}`);
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
