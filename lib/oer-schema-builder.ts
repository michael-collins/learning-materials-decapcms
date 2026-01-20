/**
 * OER Schema Builder
 * Functions for building JSON-LD schema objects from content
 */

// Using any type for ParsedContent as it's dynamically generated
type ParsedContent = any;
import { 
  extractLearningObjectives, 
  extractInstructions,
  extractYouTubePlaylist,
  parseTaskSections,
  inferActionTypes,
  getLicenseUrl,
  parseDuration
} from './oer-schema-utils';

export interface OERSchema {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

/**
 * Build OER Schema for Practice activities (Exercises)
 */
export function buildPracticeSchema(doc: ParsedContent, baseUrl: string = ''): OERSchema {
  const objectives = extractLearningObjectives(doc.body || '');
  const instructions = extractInstructions(doc.body || '');
  const playlistId = extractYouTubePlaylist(doc.body || '');
  
  // Get path - use _path from Nuxt Content or fallback to slug
  const path = doc._path || (doc.slug ? `/exercises/${doc.slug}` : '');
  
  const schema: OERSchema = {
    '@context': 'https://oerschema.org/',
    '@type': doc.type || 'oer:Practice',
    'name': doc.title,
    'url': `${baseUrl}${path}`,
    'inLanguage': 'en-US',
  };
  
  // Description
  if (doc.description) {
    schema.description = doc.description;
  }
  
  // Educational level (difficulty)
  if (doc.difficulty) {
    schema.educationalLevel = doc.difficulty;
  }
  
  // Author
  if (doc.author) {
    schema.author = {
      '@type': 'Person',
      'name': doc.author,
      ...(doc.authorUrl && { 'url': doc.authorUrl })
    };
  }
  
  // License
  if (doc.license) {
    schema.license = getLicenseUrl(doc.license);
  }
  
  // Learning Objectives
  if (objectives.length > 0) {
    schema.hasLearningObjective = objectives.map(obj => ({
      '@type': 'oer:LearningObjective',
      'description': obj
    }));
  }
  
  // Tutorial Video as Supporting Material
  if (playlistId) {
    schema.material = {
      '@type': 'oer:SupportingMaterial',
      'materialType': 'Video Tutorial',
      'encodingFormat': 'video/youtube',
      'contentUrl': `https://youtube.com/embed/videoseries?list=${playlistId}`,
      'name': 'Tutorial Video'
    };
  }
  
  // Instructions as Task
  if (instructions.length > 0) {
    const actionTypes = inferActionTypes(instructions.join(' '));
    schema.doTask = {
      '@type': 'Task',
      'name': 'Instructions',
      'steps': instructions,
      ...(actionTypes.length > 0 && { 'actionType': actionTypes })
    };
  }
  
  // Rubric
  if (doc.rubric) {
    schema.usesRubric = {
      '@type': 'oer:Rubric',
      'identifier': doc.rubric
    };
  }
  
  // Tags as keywords
  if (doc.tags && doc.tags.length > 0) {
    schema.keywords = doc.tags;
  }
  
  // Featured image
  if (doc.image) {
    schema.image = {
      '@type': 'ImageObject',
      'contentUrl': doc.image,
      ...(doc.imageAlt && { 'description': doc.imageAlt })
    };
  }
  
  // Published date
  if (doc.date) {
    schema.datePublished = doc.date;
  }
  
  return schema;
}

/**
 * Build OER Schema for Assessment activities (Projects)
 */
export function buildAssessmentSchema(doc: ParsedContent, baseUrl: string = ''): OERSchema {
  const objectives = extractLearningObjectives(doc.body || '');
  const taskSections = parseTaskSections(doc.body || '');
  const playlistId = extractYouTubePlaylist(doc.body || '');
  
  // Get path - use _path from Nuxt Content or fallback to slug
  const path = doc._path || (doc.slug ? `/projects/${doc.slug}` : '');
  
  const schema: OERSchema = {
    '@context': 'https://oerschema.org/',
    '@type': doc.type || 'oer:Assessment',
    'name': doc.title,
    'url': `${baseUrl}${path}`,
    'assessmentType': 'Project',
    'inLanguage': 'en-US',
  };
  
  // Description
  if (doc.description) {
    schema.description = doc.description;
  }
  
  // Educational level (difficulty)
  if (doc.difficulty) {
    schema.educationalLevel = doc.difficulty;
  }
  
  // Author
  if (doc.author) {
    schema.author = {
      '@type': 'Person',
      'name': doc.author,
      ...(doc.authorUrl && { 'url': doc.authorUrl })
    };
  }
  
  // License
  if (doc.license) {
    schema.license = getLicenseUrl(doc.license);
  }
  
  // Learning Objectives
  if (objectives.length > 0) {
    schema.hasLearningObjective = objectives.map(obj => ({
      '@type': 'oer:LearningObjective',
      'description': obj
    }));
  }
  
  // Tutorial Video as Supporting Material
  if (playlistId) {
    schema.material = {
      '@type': 'oer:SupportingMaterial',
      'materialType': 'Video Tutorial',
      'encodingFormat': 'video/youtube',
      'contentUrl': `https://youtube.com/embed/videoseries?list=${playlistId}`,
      'name': 'Tutorial Video'
    };
  }
  
  // Multiple instruction sections as Tasks
  if (taskSections.length > 0) {
    schema.doTask = taskSections.map(section => {
      const actionTypes = inferActionTypes(section.steps.join(' '));
      return {
        '@type': 'Task',
        'name': section.name,
        'steps': section.steps,
        ...(actionTypes.length > 0 && { 'actionType': actionTypes })
      };
    });
  }
  
  // Try to parse duration from content
  const duration = parseDuration(doc.body || '');
  if (duration) {
    schema.timeRequired = duration;
  }
  
  // Rubric
  if (doc.rubric) {
    schema.usesRubric = {
      '@type': 'oer:Rubric',
      'identifier': doc.rubric
    };
  }
  
  // Tags as keywords
  if (doc.tags && doc.tags.length > 0) {
    schema.keywords = doc.tags;
  }
  
  // Featured image
  if (doc.image) {
    schema.image = {
      '@type': 'ImageObject',
      'contentUrl': doc.image,
      ...(doc.imageAlt && { 'description': doc.imageAlt })
    };
  }
  
  // Published date
  if (doc.date) {
    schema.datePublished = doc.date;
  }
  
  return schema;
}

/**
 * Build OER Schema for Learning Components (Specializations)
 */
export function buildLearningComponentSchema(doc: ParsedContent, baseUrl: string = ''): OERSchema {
  // Use existing oer object from frontmatter if available
  if (doc.oer && typeof doc.oer === 'object') {
    return {
      ...doc.oer,
      // Add URL if not present
      'url': doc.oer.url || `${baseUrl}${doc._path || ''}`,
      // Add image if present in frontmatter
      ...(doc.image && !doc.oer.image && {
        'image': {
          '@type': 'ImageObject',
          'contentUrl': doc.image,
          ...(doc.imageAlt && { 'description': doc.imageAlt })
        }
      })
    };
  }
  
  // Fallback if no oer object
  return {
    '@context': 'https://oerschema.org/',
    '@type': 'oer:LearningComponent',
    'name': doc.title,
    'url': `${baseUrl}${doc._path || ''}`,
    'inLanguage': 'en-US'
  };
}

/**
 * Build OER Schema for Courses (Pathways)
 */
export function buildCourseSchema(doc: ParsedContent, baseUrl: string = ''): OERSchema {
  // Use existing oer object from frontmatter if available
  if (doc.oer && typeof doc.oer === 'object') {
    return {
      ...doc.oer,
      // Add URL if not present
      'url': doc.oer.url || `${baseUrl}${doc._path || ''}`,
      // Add image if present in frontmatter
      ...(doc.image && !doc.oer.image && {
        'image': {
          '@type': 'ImageObject',
          'contentUrl': doc.image,
          ...(doc.imageAlt && { 'description': doc.imageAlt })
        }
      })
    };
  }
  
  // Fallback if no oer object
  return {
    '@context': 'https://oerschema.org/',
    '@type': 'oer:Course',
    'name': doc.title,
    'url': `${baseUrl}${doc._path || ''}`,
    'inLanguage': 'en-US'
  };
}

/**
 * Build OER Schema for Supporting Material (Lectures)
 */
export function buildSupportingMaterialSchema(doc: ParsedContent, baseUrl: string = ''): OERSchema {
  // Use existing oer object from frontmatter if available
  if (doc.oer && typeof doc.oer === 'object') {
    return {
      ...doc.oer,
      // Add URL if not present
      'url': doc.oer.url || `${baseUrl}${doc._path || ''}`,
    };
  }
  
  // Fallback if no oer object
  return {
    '@context': 'https://oerschema.org/',
    '@type': 'oer:SupportingMaterial',
    'name': doc.title,
    'url': `${baseUrl}${doc._path || ''}`,
    'inLanguage': 'en-US'
  };
}
