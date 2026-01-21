const fs = require('fs');
const path = require('path');

const csvPath = '/Users/msc227/Downloads/resources-Grid view.csv';
const outputPath = path.join(__dirname, '../content/data/resources.json');

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(',');

const resources = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  
  // Parse CSV line handling quoted fields
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  if (values.length < 7) continue; // Skip incomplete rows
  
  const resource = {
    name: values[0].trim(),
    description: values[1].trim() || '',
    body: values[2].trim() || '',
    type: values[3].trim() || '',
    tags: values[4].trim() ? values[4].split(',').map(t => t.trim()) : [],
    url: values[5].trim() || '',
    alt: values[6].trim() || values[0].trim()
  };
  
  resources.push(resource);
}

// Write to JSON file
fs.writeFileSync(outputPath, JSON.stringify(resources, null, 2));
console.log(`Converted ${resources.length} resources to ${outputPath}`);
