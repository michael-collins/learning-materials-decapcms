import fs from 'fs';
import { glob } from 'glob';

const author = 'Michael Collins';
const authorUrl = 'https://michaelcollins.xyz';
const license = 'CC BY 4.0';

// Find all pathway and specialization markdown files
const pathwayFiles = await glob('content/pathways/**/*.md');
const specializationFiles = await glob('content/specializations/**/*.md');
const allFiles = [...pathwayFiles, ...specializationFiles];

console.log(`Found ${allFiles.length} files to update`);

let updatedCount = 0;

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find the frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  
  if (!frontmatterMatch) {
    console.log(`Skipping ${file} (no frontmatter found)`);
    return;
  }
  
  const frontmatter = frontmatterMatch[1];
  
  // Check if top-level author or license already exists (not nested in oer: block)
  // Split by lines and check for non-indented author: or license: fields
  const lines = frontmatter.split('\n');
  const hasTopLevelAuthor = lines.some(line => /^author:/.test(line));
  const hasTopLevelLicense = lines.some(line => /^license:/.test(line) && !/^  /.test(line));
  
  if (hasTopLevelAuthor && hasTopLevelLicense) {
    console.log(`Skipping ${file} (already has top-level author and license)`);
    return;
  }
  
  const restOfContent = content.slice(frontmatterMatch[0].length);
  
  // Build new fields to add
  let fieldsToAdd = [];
  if (!hasTopLevelAuthor) {
    fieldsToAdd.push(`author: ${author}`, `authorUrl: ${authorUrl}`);
  }
  if (!hasTopLevelLicense) {
    fieldsToAdd.push(`license: ${license}`);
  }
  
  // Add author and license fields before the closing ---
  const newFrontmatter = `---
${frontmatter}
${fieldsToAdd.join('\n')}
---${restOfContent}`;
  
  fs.writeFileSync(file, newFrontmatter);
  updatedCount++;
  console.log(`Updated ${file}`);
});

console.log(`\nUpdated ${updatedCount} files`);
