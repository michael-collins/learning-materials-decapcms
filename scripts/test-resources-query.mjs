import { readFileSync } from 'fs';

// Read the raw JSON
const rawJSON = readFileSync('content/data/resources.json', 'utf-8');
const parsed = JSON.parse(rawJSON);

console.log('Raw JSON file:');
console.log('- Type:', typeof parsed);
console.log('- Is Array:', Array.isArray(parsed));
console.log('- Length:', parsed.length);
console.log('- First item:', JSON.stringify(parsed[0], null, 2));

// Check rubrics for comparison
const rubricsJSON = readFileSync('content/data/rubrics.json', 'utf-8');
const rubricsParsed = JSON.parse(rubricsJSON);

console.log('\nRubrics JSON file:');
console.log('- Type:', typeof rubricsParsed);
console.log('- Is Array:', Array.isArray(rubricsParsed));
console.log('- Length:', rubricsParsed.length);
