// Quick test to see what rubric data looks like
import { readFileSync } from 'fs';

// Check .data folder for SQLite database structure
import { execSync } from 'child_process';
try {
  const result = execSync('find .data -name "*.sqlite*" -o -name "*.db" 2>/dev/null || echo "no db files"');
  console.log('DB files:', result.toString());
} catch (e) {
  console.log('No .data folder or db files');
}

// List rubrics files
const rubricFiles = execSync('ls -la content/rubrics/').toString();
console.log('Rubric files:');
console.log(rubricFiles);
