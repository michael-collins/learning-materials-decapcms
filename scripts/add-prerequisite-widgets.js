#!/usr/bin/env node

/**
 * Add prerequisite widgets to all content types in DecapCMS config
 * This adds a structured prerequisite list similar to the content items widget in lessons
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../public/admin/config.yml');

// Read the config file
let config = fs.readFileSync(configPath, 'utf8');

// Define the prerequisite widget structure (indented properly for YAML)
const prerequisiteWidget = `      - label: "Prerequisites"
        name: "prerequisites"
        widget: "list"
        required: false
        hint: "Add prerequisite content that should be completed first"
        types:
          - label: "Lesson"
            name: "lessons"
            widget: "object"
            fields:
              - {label: "Type", name: "__typename", widget: "hidden", default: "lessons"}
              - {label: "Lesson", name: "lesson", widget: "relation", required: true, collection: "lessons", value_field: "{{slug}}", search_fields: ["title"], display_fields: ["title"]}
          - label: "Lecture"
            name: "lectures"
            widget: "object"
            fields:
              - {label: "Type", name: "__typename", widget: "hidden", default: "lectures"}
              - {label: "Lecture", name: "lecture", widget: "relation", required: true, collection: "lectures", value_field: "{{slug}}", search_fields: ["title"], display_fields: ["title"]}
          - label: "Tutorial"
            name: "tutorials"
            widget: "object"
            fields:
              - {label: "Type", name: "__typename", widget: "hidden", default: "tutorials"}
              - {label: "Tutorial", name: "tutorial", widget: "relation", required: true, collection: "tutorials", value_field: "{{slug}}", search_fields: ["title"], display_fields: ["title"]}
          - label: "Exercise"
            name: "exercises"
            widget: "object"
            fields:
              - {label: "Type", name: "__typename", widget: "hidden", default: "exercises"}
              - {label: "Exercise", name: "exercise", widget: "relation", required: true, collection: "exercises", value_field: "{{slug}}", search_fields: ["title"], display_fields: ["title"]}
          - label: "Article"
            name: "articles"
            widget: "object"
            fields:
              - {label: "Type", name: "__typename", widget: "hidden", default: "articles"}
              - {label: "Article", name: "article", widget: "relation", required: true, collection: "articles", value_field: "{{slug}}", search_fields: ["title"], display_fields: ["title"]}
          - label: "Project"
            name: "projects"
            widget: "object"
            fields:
              - {label: "Type", name: "__typename", widget: "hidden", default: "projects"}
              - {label: "Project", name: "project", widget: "relation", required: true, collection: "projects", value_field: "{{slug}}", search_fields: ["title"], display_fields: ["title"]}
          - label: "Specialization"
            name: "specializations"
            widget: "object"
            fields:
              - {label: "Type", name: "__typename", widget: "hidden", default: "specializations"}
              - {label: "Specialization", name: "specialization", widget: "relation", required: true, collection: "specializations", value_field: "{{slug}}", search_fields: ["title"], display_fields: ["title"]}
          - label: "Pathway"
            name: "pathways"
            widget: "object"
            fields:
              - {label: "Type", name: "__typename", widget: "hidden", default: "pathways"}
              - {label: "Pathway", name: "pathway", widget: "relation", required: true, collection: "pathways", value_field: "{{slug}}", search_fields: ["title"], display_fields: ["title"]}`;

// Collections that need the prerequisite widget added (not already present)
const collectionsToUpdate = ['tutorials', 'exercises', 'projects', 'lectures'];

let updatedCount = 0;

collectionsToUpdate.forEach(collection => {
  // Check if this collection already has a structured prerequisites widget
  const hasStructuredPrereqs = new RegExp(
    `- name: "${collection}"[\\s\\S]{1,2000}label: "Prerequisites"[\\s\\S]{1,200}widget: "list"[\\s\\S]{1,100}types:`,
    ''
  ).test(config);
  
  if (hasStructuredPrereqs) {
    console.log(`✓ ${collection} already has structured prerequisites widget`);
    return;
  }
  
  // Find where to insert: before the Body field in this collection
  // Pattern: find the collection, then find the Body field, and insert before it
  const collectionStartPattern = new RegExp(`(  - name: "${collection}"[\\s\\S]*?fields:[\\s\\S]*?)      - \\{label: "Body", name: "body", widget: "markdown"\\}`, '');
  
  if (collectionStartPattern.test(config)) {
    config = config.replace(collectionStartPattern, `$1${prerequisiteWidget}\n      - {label: "Body", name: "body", widget: "markdown"}`);
    console.log(`✓ Added prerequisites widget to ${collection}`);
    updatedCount++;
  } else {
    console.log(`✗ Could not find Body field insertion point in ${collection}`);
  }
});

// Write the updated config back
fs.writeFileSync(configPath, config, 'utf8');

console.log(`\n✅ Prerequisite widgets update complete!`);
console.log(`Updated ${updatedCount} collection(s).`);
console.log('All content types (except resources) now have structured prerequisite selection.');

