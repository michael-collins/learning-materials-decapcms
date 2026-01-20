import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.join(__dirname, '../content');

// Patterns to match old YAML-style components
const patterns = [
  {
    name: 'iframe-component',
    // Match: ::iframe-component\n---\nsrc: URL\ntitle: TITLE\n---\n::
    regex: /::iframe-component\s*\n---\s*\nsrc:\s*([^\n]+)\s*\ntitle:\s*([^\n]+)\s*\n---\s*\n::/g,
    convert: (match, src, title) => {
      return `::iframe-component{src="${src.trim()}" title="${title.trim()}"}`;
    }
  },
  {
    name: 'youtube-video',
    // Match: ::youtube-video\n---\nid: ID\ntitle: TITLE\n---\n::
    regex: /::youtube-video\s*\n---\s*\nid:\s*([^\n]+)\s*\ntitle:\s*([^\n]+)\s*\n---\s*\n::/g,
    convert: (match, id, title) => {
      return `::youtube-video{id="${id.trim()}" title="${title.trim()}"}`;
    }
  },
  {
    name: 'google-slides',
    // Match: ::google-slides\n---\nid: ID\n---\n::
    regex: /::google-slides\s*\n---\s*\nid:\s*([^\n]+)\s*\n---\s*\n::/g,
    convert: (match, id) => {
      return `::google-slides{id="${id.trim()}"}`;
    }
  },
  {
    name: 'rubric-component',
    // Match: ::rubric-component\n---\nrubric: RUBRIC\n---\n::
    regex: /::rubric-component\s*\n---\s*\nrubric:\s*([^\n]+)\s*\n---\s*\n::/g,
    convert: (match, rubric) => {
      return `::rubric-component{rubric="${rubric.trim()}"}`;
    }
  }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let changes = [];

  // First pass: convert component syntax
  patterns.forEach(pattern => {
    const matches = [...content.matchAll(pattern.regex)];
    if (matches.length > 0) {
      matches.forEach(match => {
        changes.push(`  - ${pattern.name}: converted`);
      });
      content = content.replace(pattern.regex, pattern.convert);
      modified = true;
    }
  });

  // Second pass: remove ## Tutorial Video headings that appear before components
  const tutorialVideoHeadingRegex = /## Tutorial Video\s*\n\s*(?=::)/g;
  if (tutorialVideoHeadingRegex.test(content)) {
    content = content.replace(/## Tutorial Video\s*\n\s*(?=::)/g, '');
    changes.push('  - Removed "## Tutorial Video" heading');
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

console.log('🔄 Converting component syntax...\n');
const modified = walkDirectory(contentDir);
console.log(`\n✨ Done! Modified ${modified} file(s).`);
