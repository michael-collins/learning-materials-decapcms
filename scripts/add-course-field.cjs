const fs = require('fs');
const path = require('path');

// Define content directories to process
const contentDirs = [
  'content/exercises',
  'content/projects',
  'content/lectures',
  'content/pathways',
  'content/specializations'
];

// Mapping of authors to courses
const authorToCourse = {
  'Michael Collins': 'DART 303',
  'Kenneth Ian Brill': 'DART 203'
};

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file has frontmatter
    if (!content.startsWith('---')) {
      console.log(`Skipping ${filePath}: No frontmatter found`);
      return;
    }

    // Split content into frontmatter and body
    const parts = content.split('---');
    if (parts.length < 3) {
      console.log(`Skipping ${filePath}: Invalid frontmatter structure`);
      return;
    }

    let frontmatter = parts[1];
    const body = parts.slice(2).join('---');

    // Check if course field already exists
    if (frontmatter.includes('course:')) {
      console.log(`Skipping ${filePath}: course field already exists`);
      return;
    }

    // Extract author from frontmatter
    const authorMatch = frontmatter.match(/^author:\s*(.+)$/m);
    
    if (authorMatch) {
      const author = authorMatch[1].trim();
      const course = authorToCourse[author];
      
      if (course) {
        // Find the position to insert course field (after author)
        const authorLine = authorMatch[0];
        const authorIndex = frontmatter.indexOf(authorLine);
        const afterAuthor = authorIndex + authorLine.length;
        
        // Insert course field after author
        frontmatter = frontmatter.slice(0, afterAuthor) + 
                     `\ncourse: ${course}` + 
                     frontmatter.slice(afterAuthor);
        
        // Reconstruct the file
        const newContent = '---' + frontmatter + '---' + body;
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✓ Updated ${filePath} with course: ${course}`);
      } else {
        // Add course field without value for other authors
        const authorLine = authorMatch[0];
        const authorIndex = frontmatter.indexOf(authorLine);
        const afterAuthor = authorIndex + authorLine.length;
        
        frontmatter = frontmatter.slice(0, afterAuthor) + 
                     `\ncourse:` + 
                     frontmatter.slice(afterAuthor);
        
        const newContent = '---' + frontmatter + '---' + body;
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✓ Updated ${filePath} with empty course field (author: ${author})`);
      }
    } else {
      // No author field, just add empty course field at the end of frontmatter
      frontmatter = frontmatter.trimEnd() + '\ncourse:\n';
      const newContent = '---' + frontmatter + '---' + body;
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✓ Updated ${filePath} with empty course field (no author)`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  const fullPath = path.join(process.cwd(), dirPath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Directory not found: ${fullPath}`);
    return;
  }

  const files = fs.readdirSync(fullPath);
  
  files.forEach(file => {
    if (file.endsWith('.md')) {
      const filePath = path.join(fullPath, file);
      processFile(filePath);
    }
  });
}

console.log('Starting to add course field to content files...\n');

contentDirs.forEach(dir => {
  console.log(`\nProcessing directory: ${dir}`);
  processDirectory(dir);
});

console.log('\nDone!');
