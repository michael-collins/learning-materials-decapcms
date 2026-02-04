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
  getAIULUrl,
  getAIULDescription,
  parseDuration
} from './oer-schema-utils';

export interface OERSchema {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

/**
 * Build OER Schema for Practice activities (Exercises)
 * Structures as InstructionalPattern with hasComponent for better OER Schema compliance
 */
export function buildPracticeSchema(doc: ParsedContent, baseUrl: string = '', versionParam?: string): OERSchema {
  const objectives = extractLearningObjectives(doc.body || '');
  const instructions = extractInstructions(doc.body || '');
  const playlistId = extractYouTubePlaylist(doc.body || '');
  
  // Get path - use _path from Nuxt Content or fallback to slug
  let path = doc._path || (doc.slug ? `/exercises/${doc.slug}` : '');
  
  // If path contains /v/ (versioned path), extract the base path
  if (path.includes('/v/')) {
    path = path.substring(0, path.indexOf('/v/'));
  }
  
  // Add version parameter if provided
  if (versionParam && versionParam !== 'latest') {
    path = `${path}?version=${versionParam}`;
  }
  
  const baseId = `${baseUrl}${path}`;
  
  // Build hasComponent array with sub-components
  const components: any[] = [];
  
  // Add Learning Objectives as separate components
  if (objectives.length > 0) {
    objectives.forEach((obj, idx) => {
      components.push({
        '@type': 'oer:LearningObjective',
        '@id': `${baseId}#learning-objective-${idx + 1}`,
        'name': `Learning Objective ${idx + 1}`,
        'description': obj
      });
    });
  }
  
  // Add Tutorial Video as LearningComponent
  if (playlistId) {
    components.push({
      '@type': 'oer:SupportingMaterial',
      '@id': `${baseId}#tutorial-video`,
      'name': 'Tutorial Video',
      'materialType': 'Video Tutorial',
      'encodingFormat': 'video/youtube',
      'contentUrl': `https://youtube.com/embed/videoseries?list=${playlistId}`,
      'actionType': ['Observing']
    });
  }
  
  // Add Instructions as Practice component
  if (instructions.length > 0) {
    const actionTypes = inferActionTypes(instructions.join(' '));
    components.push({
      '@type': 'oer:Practice',
      '@id': `${baseId}#practice-instructions`,
      'name': 'Practice Instructions',
      'doTask': {
        '@type': 'Task',
        'steps': instructions
      },
      ...(actionTypes.length > 0 && { 'actionType': actionTypes })
    });
  }
  
  // Main schema as InstructionalPattern
  const schema: OERSchema = {
    '@context': {
      'oer': 'https://oerschema.org/',
      'schema': 'https://schema.org/'
    },
    '@type': 'oer:InstructionalPattern',
    '@id': baseId,
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
  
  // AI Usage Constraint (AIUL)
  if (doc.aiLicense) {
    const licenses = Array.isArray(doc.aiLicense) ? doc.aiLicense : [doc.aiLicense];
    const constraintUrls = licenses.map((license: string) => getAIULUrl(license));
    schema['oer:aiUsageConstraint'] = constraintUrls.length === 1 ? constraintUrls[0] : constraintUrls;
  }
  
  // Link to learning objectives
  if (objectives.length > 0) {
    schema.hasLearningObjective = objectives.map((obj, idx) => ({
      '@id': `${baseId}#learning-objective-${idx + 1}`
    }));
  }
  
  // Add all components
  if (components.length > 0) {
    schema.hasComponent = components;
  }
  
  // Rubric
  if (doc.rubric) {
    schema.usesRubric = {
      '@type': 'oer:Rubric',
      'identifier': doc.rubric,
      'url': `${baseUrl}/rubrics/${doc.rubric}`
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
export function buildAssessmentSchema(doc: ParsedContent, baseUrl: string = '', versionParam?: string): OERSchema {
  const objectives = extractLearningObjectives(doc.body || '');
  const taskSections = parseTaskSections(doc.body || '');
  const playlistId = extractYouTubePlaylist(doc.body || '');
  
  // Get path - use _path from Nuxt Content or fallback to slug
  let path = doc._path || (doc.slug ? `/projects/${doc.slug}` : '');
  
  // If path contains /v/ (versioned path), extract the base path
  if (path.includes('/v/')) {
    path = path.substring(0, path.indexOf('/v/'));
  }
  
  // Add version parameter if provided
  if (versionParam && versionParam !== 'latest') {
    path = `${path}?version=${versionParam}`;
  }
  
  const schema: OERSchema = {
    '@context': {
      'oer': 'https://oerschema.org/',
      'schema': 'https://schema.org/'
    },
    '@type': 'oer:Assessment',
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
  
  // AI Usage Constraint (AIUL)
  if (doc.aiLicense) {
    const licenses = Array.isArray(doc.aiLicense) ? doc.aiLicense : [doc.aiLicense];
    const constraintUrls = licenses.map((license: string) => getAIULUrl(license));
    schema['oer:aiUsageConstraint'] = constraintUrls.length === 1 ? constraintUrls[0] : constraintUrls;
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
      'identifier': doc.rubric,
      'url': `${baseUrl}/rubrics/${doc.rubric}`
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
    '@context': {
      'oer': 'https://oerschema.org/',
      'schema': 'https://schema.org/'
    },
    '@type': 'oer:LearningComponent',
    'name': doc.title,
    'url': `${baseUrl}${doc._path || ''}`,
    'inLanguage': 'en-US'
  };
}

/**
 * Build OER Schema for Pathways (oer:Course)
 * Top-level learning pathway with specializations as hasPart
 */
export function buildPathwaySchema(doc: ParsedContent, specializations: ParsedContent[] = [], baseUrl: string = ''): OERSchema {
  const path = doc._path || (doc.slug ? `/pathways/${doc.slug}` : '');
  const baseId = `${baseUrl}${path}`;
  
  const schema: OERSchema = {
    '@context': {
      'oer': 'https://oerschema.org/',
      'schema': 'https://schema.org/'
    },
    '@type': 'oer:Course',
    '@id': baseId,
    'name': doc.title,
    'url': baseId,
    'inLanguage': 'en-US',
    'isAccessibleForFree': true,
  };
  
  // Description
  if (doc.description) {
    schema.description = doc.description;
  }
  
  // Educational level (difficulty)
  if (doc.difficulty) {
    schema.educationalLevel = doc.difficulty;
  }
  
  // Estimated duration
  if (doc.estimatedDuration) {
    // Convert human-readable duration to ISO 8601
    const duration = parseDurationToISO8601(doc.estimatedDuration);
    if (duration) {
      schema.timeRequired = duration;
    }
  }
  
  // Learning objectives
  if (doc.learningObjectives && doc.learningObjectives.length > 0) {
    schema.teaches = doc.learningObjectives.map((obj: string, idx: number) => ({
      '@type': 'oer:LearningObjective',
      '@id': `${baseId}#objective-${idx + 1}`,
      'description': obj
    }));
  }
  
  // Specializations as hasPart
  if (specializations && specializations.length > 0) {
    schema.hasPart = specializations.map(spec => ({
      '@type': 'oer:InstructionalPattern',
      '@id': `${baseUrl}/specializations/${spec.slug}`,
      'name': spec.title
    }));
  }
  
  // Author
  if (doc.author) {
    schema.author = {
      '@type': 'Person',
      'name': doc.author
    };
  }
  
  // License
  if (doc.license) {
    schema.license = getLicenseUrl(doc.license);
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
  
  return schema;
}

/**
 * Build OER Schema for Specializations (oer:InstructionalPattern)
 * Structured learning track with lessons as hasPart and parent pathway
 */
export function buildSpecializationSchema(doc: ParsedContent, parentPathway?: ParsedContent, lessons: ParsedContent[] = [], baseUrl: string = ''): OERSchema {
  const path = doc._path || (doc.slug ? `/specializations/${doc.slug}` : '');
  const baseId = `${baseUrl}${path}`;
  
  const schema: OERSchema = {
    '@context': {
      'oer': 'https://oerschema.org/',
      'schema': 'https://schema.org/'
    },
    '@type': 'oer:InstructionalPattern',
    '@id': baseId,
    'name': doc.title,
    'url': baseId,
    'inLanguage': 'en-US',
  };
  
  // Description
  if (doc.description) {
    schema.description = doc.description;
  }
  
  // Parent pathway
  if (parentPathway || doc.pathway) {
    const pathwaySlug = parentPathway?.slug || doc.pathway;
    schema.isPartOf = {
      '@type': 'oer:Course',
      '@id': `${baseUrl}/pathways/${pathwaySlug}`,
      'name': parentPathway?.title || doc.pathway
    };
  }
  
  // Educational level (difficulty)
  if (doc.difficulty) {
    schema.educationalLevel = doc.difficulty;
  }
  
  // Target role
  if (doc.targetRole) {
    schema.educationalRole = doc.targetRole;
  }
  
  // Estimated duration
  if (doc.estimatedDuration) {
    const duration = parseDurationToISO8601(doc.estimatedDuration);
    if (duration) {
      schema.timeRequired = duration;
    }
  }
  
  // Learning objectives
  if (doc.learningObjectives && doc.learningObjectives.length > 0) {
    schema.teaches = doc.learningObjectives.map((obj: string, idx: number) => ({
      '@type': 'oer:LearningObjective',
      '@id': `${baseId}#objective-${idx + 1}`,
      'description': obj
    }));
  }
  
  // Skills
  if (doc.skills && doc.skills.length > 0) {
    schema.buildsFluency = doc.skills.map((skill: string) => ({
      '@type': 'oer:Skill',
      'name': skill
    }));
  }
  
  // Tools/materials
  if (doc.tools && doc.tools.length > 0) {
    schema.material = doc.tools.map((tool: string) => ({
      '@type': 'CreativeWork',
      'name': tool
    }));
  }
  
  // Lessons as hasPart
  if (lessons && lessons.length > 0) {
    schema.hasPart = lessons
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(lesson => ({
        '@type': 'oer:LearningComponent',
        '@id': `${baseUrl}/lessons/${lesson.slug}`,
        'name': lesson.title,
        'position': lesson.order || 1
      }));
  }
  
  // Author
  if (doc.author) {
    schema.author = {
      '@type': 'Person',
      'name': doc.author
    };
  }
  
  // License
  if (doc.license) {
    schema.license = getLicenseUrl(doc.license);
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
  
  return schema;
}

/**
 * Build OER Schema for Lessons (oer:LearningComponent)
 * Individual learning unit with lectures, exercises, and projects as hasPart
 */
export function buildLessonSchema(doc: ParsedContent, parentSpecialization?: ParsedContent, content?: { lectures: ParsedContent[], exercises: ParsedContent[], projects: ParsedContent[] }, baseUrl: string = ''): OERSchema {
  const path = doc._path || (doc.slug ? `/lessons/${doc.slug}` : '');
  const baseId = `${baseUrl}${path}`;
  
  const schema: OERSchema = {
    '@context': {
      'oer': 'https://oerschema.org/',
      'schema': 'https://schema.org/'
    },
    '@type': 'oer:InstructionalPattern',
    '@id': baseId,
    'name': doc.title,
    'url': baseId,
    'inLanguage': 'en-US',
  };
  
  // Description
  if (doc.description) {
    schema.description = doc.description;
  }
  
  // Parent specialization
  if (parentSpecialization || doc.specialization) {
    const specSlug = parentSpecialization?.slug || doc.specialization;
    schema.isPartOf = {
      '@type': 'oer:InstructionalPattern',
      '@id': `${baseUrl}/specializations/${specSlug}`,
      'name': parentSpecialization?.title || doc.specialization
    };
  }
  
  // Order/position in specialization
  if (doc.order) {
    schema.position = doc.order;
  }
  
  // Estimated duration
  if (doc.estimatedDuration) {
    const duration = parseDurationToISO8601(doc.estimatedDuration);
    if (duration) {
      schema.timeRequired = duration;
    }
  }
  
  // Learning objectives with @id references
  if (doc.learningObjectives && doc.learningObjectives.length > 0) {
    schema.hasLearningObjective = doc.learningObjectives.map((obj: string, idx: number) => ({
      '@type': 'oer:LearningObjective',
      '@id': `${baseId}#objective-${idx + 1}`,
      'description': obj
    }));
  }
  
  // Content components (lectures, exercises, projects)
  if (content) {
    const components: any[] = [];
    
    // Add lectures
    if (content.lectures && content.lectures.length > 0) {
      content.lectures.forEach(lecture => {
        if (lecture && lecture.slug && lecture.title) {
          components.push({
            '@type': 'oer:SupportingMaterial',
            '@id': `${baseUrl}/lectures/${lecture.slug}`,
            'name': lecture.title,
            'materialType': 'Lecture'
          });
        }
      });
    }
    
    // Add exercises
    if (content.exercises && content.exercises.length > 0) {
      content.exercises.forEach(exercise => {
        if (exercise && exercise.slug && exercise.title) {
          components.push({
            '@type': 'oer:Practice',
            '@id': `${baseUrl}/exercises/${exercise.slug}`,
            'name': exercise.title,
            ...(exercise.difficulty && { 'educationalLevel': exercise.difficulty })
          });
        }
      });
    }
    
    // Add projects
    if (content.projects && content.projects.length > 0) {
      content.projects.forEach(project => {
        if (project && project.slug && project.title) {
          components.push({
            '@type': 'oer:Assessment',
            '@id': `${baseUrl}/projects/${project.slug}`,
            'name': project.title,
            'assessmentType': 'Project',
            ...(project.difficulty && { 'educationalLevel': project.difficulty })
          });
        }
      });
    }
    
    if (components.length > 0) {
      schema.hasComponent = components;
    }
  }
  
  // Author
  if (doc.author) {
    schema.author = {
      '@type': 'Person',
      'name': doc.author,
      ...(doc.authorUrl && { 'url': doc.authorUrl })
    };
  }
  
  // Prerequisites (coursePrerequisites per Schema.org/OER Schema)
  if (doc.prerequisites && doc.prerequisites.length > 0) {
    schema.coursePrerequisites = doc.prerequisites.map((prereq: any) => {
      const typename = prereq.__typename;
      const typeMap: Record<string, string> = {
        lessons: 'lessons',
        lectures: 'lectures',
        tutorials: 'tutorials',
        exercises: 'exercises',
        articles: 'articles',
        projects: 'projects',
        specializations: 'specializations',
        pathways: 'pathways'
      };
      
      const collection = typeMap[typename];
      if (!collection) return null;
      
      // Get the slug from the appropriate field
      const fieldMap: Record<string, string> = {
        lessons: 'lesson',
        lectures: 'lecture',
        tutorials: 'tutorial',
        exercises: 'exercise',
        articles: 'article',
        projects: 'project',
        specializations: 'specialization',
        pathways: 'pathway'
      };
      
      const field = fieldMap[typename];
      const slug = prereq[field];
      
      if (!slug) return null;
      
      // Return as AlignmentObject with URL reference
      return {
        '@type': 'AlignmentObject',
        'alignmentType': 'prerequisite',
        'targetUrl': `${baseUrl}/${collection}/${slug}`
      };
    }).filter(Boolean);
  }
  
  // License
  if (doc.license) {
    schema.license = getLicenseUrl(doc.license);
  }
  
  // Tags as keywords
  if (doc.tags && doc.tags.length > 0) {
    schema.keywords = doc.tags;
  }
  
  return schema;
}

/**
 * Helper function to convert human-readable duration to ISO 8601 format
 */
function parseDurationToISO8601(duration: string): string | null {
  if (!duration) return null;
  
  const parts = duration.toLowerCase().match(/(\d+)\s*(hour|day|week|month|year)s?/g);
  if (!parts) return null;
  
  let result = 'P';
  let timeAdded = false;
  
  parts.forEach(part => {
    const match = part.match(/(\d+)\s*(hour|day|week|month|year)/);
    if (match) {
      const num = match[1];
      const unit = match[2];
      
      switch (unit) {
        case 'hour':
          if (!timeAdded) result += 'T';
          result += num + 'H';
          timeAdded = true;
          break;
        case 'day':
          result += num + 'D';
          break;
        case 'week':
          result += (parseInt(num) * 7) + 'D';
          break;
        case 'month':
          result += num + 'M';
          break;
        case 'year':
          result += num + 'Y';
          break;
      }
    }
  });
  
  return result === 'P' ? null : result;
}
/**
 * Build OER Schema for Supporting Material (Lectures)
 * Maintains backward compatibility with existing lectures via oer frontmatter field
 */
export function buildSupportingMaterialSchema(doc: ParsedContent, baseUrl: string = '', versionParam?: string): OERSchema {
  let path = doc._path || (doc.slug ? `/lectures/${doc.slug}` : '')
  
  // If path contains /v/ (versioned path), extract the base path
  if (path.includes('/v/')) {
    path = path.substring(0, path.indexOf('/v/'));
  }
  
  // Add version parameter if provided
  if (versionParam && versionParam !== 'latest') {
    path = `${path}?version=${versionParam}`;
  }
  
  const fullUrl = `${baseUrl}${path}`
  
  const schema: OERSchema = {
    '@context': {
      'oer': 'https://oerschema.org/',
      'schema': 'https://schema.org/'
    },
    '@type': 'oer:SupportingMaterial',
    '@id': fullUrl,
    'name': doc.title,
    'url': fullUrl,
    'inLanguage': 'en-US',
  };
  
  // Description
  if (doc.description) {
    schema.description = doc.description;
  }
  
  // Author
  if (doc.author) {
    schema.author = {
      '@type': 'Person',
      'name': doc.author
    };
  }
  
  // License
  if (doc.license) {
    schema.license = getLicenseUrl(doc.license);
  }
  
  // Tags as keywords
  if (doc.tags && doc.tags.length > 0) {
    schema.keywords = doc.tags;
  }
  
  // Material type (default to "Slide Deck" for lectures since they typically contain Google Slides)
  schema.materialType = 'Slide Deck';
  
  // Encoding format (Google Slides)
  schema.encodingFormat = 'application/vnd.google-apps.presentation';
  
  // Course/context information
  if (doc.course) {
    schema.courseCode = doc.course;
  }
  
  // Duration (PT45M is a common default for lecture slides)
  schema.duration = 'PT45M';
  
  return schema;
}
/**
 * Build OER Schema for Associated Material (Articles, Tutorials)
 * Articles and tutorials are supporting educational content
 */
export function buildAssociatedMaterialSchema(doc: ParsedContent, baseUrl: string = '', versionParam?: string): OERSchema {
  let path = doc._path || '';
  
  // If path contains /v/ (versioned path), extract the base path
  if (path.includes('/v/')) {
    path = path.substring(0, path.indexOf('/v/'));
  }
  
  // Add version parameter if provided
  if (versionParam && versionParam !== 'latest') {
    path = `${path}?version=${versionParam}`;
  }
  
  const fullUrl = `${baseUrl}${path}`;
  
  const schema: OERSchema = {
    '@context': {
      'oer': 'https://oerschema.org/',
      'schema': 'https://schema.org/'
    },
    '@type': 'oer:AssociatedMaterial',
    '@id': fullUrl,
    'name': doc.title,
    'url': fullUrl,
    'inLanguage': 'en-US',
  };
  
  // Description
  if (doc.description) {
    schema.description = doc.description;
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
  
  // AI Usage Constraint (AIUL)
  if (doc.aiLicense) {
    const licenses = Array.isArray(doc.aiLicense) ? doc.aiLicense : [doc.aiLicense];
    const constraintUrls = licenses.map((license: string) => getAIULUrl(license));
    schema['oer:aiUsageConstraint'] = constraintUrls.length === 1 ? constraintUrls[0] : constraintUrls;
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
  
  // Educational level (difficulty)
  if (doc.difficulty) {
    schema.educationalLevel = doc.difficulty;
  }
  
  return schema;
}

/**
 * Backward compatibility wrapper for buildPathwaySchema
 * @deprecated Use buildPathwaySchema instead
 */
export function buildCourseSchema(doc: ParsedContent, specializations: ParsedContent[] = [], baseUrl: string = ''): OERSchema {
  return buildPathwaySchema(doc, specializations, baseUrl);
}
