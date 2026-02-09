import { ref, computed } from 'vue'

export interface RubricCriterion {
  name: string
  description: string
}

export interface Rubric {
  slug: string
  name: string
  description: string
  assessmentType: 'formative' | 'summative'
  criteria: RubricCriterion[]
}

// All rubric data embedded directly — small enough to include at runtime
// Source of truth: content/rubrics/*.md
const RUBRICS: Record<string, Rubric> = {
  exercise: {
    slug: 'exercise',
    name: 'Exercise',
    assessmentType: 'formative',
    description: 'An exercise assessment type is formative and tends to focus on evaluating mastery of a narrow set of competencies and capabilities, defined in the learning objectives.',
    criteria: [
      {
        name: 'Steps completed',
        description: 'This criteria assesses whether you completed all parts of a given set of instructions.'
      },
      {
        name: 'Attention to detail',
        description: 'This criteria measures ability to use proper naming conventions and formats, meet submission deadlines, check to see that others are able to access submitted materials, and fulfills other specified requirements.'
      },
      {
        name: 'On time',
        description: 'This criterion checks to see if the assigned task was submitted on time. This indirectly assesses time management.'
      }
    ]
  },
  project: {
    slug: 'project',
    name: 'Project',
    assessmentType: 'summative',
    description: 'A project assessment type is summative and tends to focus on evaluating mastery of a large scope of competencies and capabilities, defined in the learning objectives.',
    criteria: [
      {
        name: 'Concept development',
        description: 'This criterion attempts to measure your ability to respond to project themes and learning objectives through creative thinking processes, account for technical and causal relationships through systems thinking, and show awareness of cultural contexts and philosophical or ideological mappings through critical thinking.'
      },
      {
        name: 'Technical mastery',
        description: 'This grading criterion measures your ability to quickly gain and apply necessary technical understanding. Working with new digital formats, following technical instructions, using digital and analog tools, and applying formal elements and principles of design can all be considered aspects of technical mastery. Often, learning resources outside of provided course content will need to be consulted to acquire pre-requisite knowledge and skills that may be lacking. Your ability to quickly and efficiently locate and absorb technical knowledge is essential for success after your studies.'
      },
      {
        name: 'Steps completed',
        description: 'This criteria assesses whether you completed all parts of a given set of instructions.'
      }
    ]
  },
  task: {
    slug: 'task',
    name: 'Task',
    assessmentType: 'formative',
    description: 'This formative assessment measures completeness of a given task. It is typically in the context of a larger assessment goal.',
    criteria: [
      {
        name: 'On time',
        description: 'This criterion checks to see if the assigned task was submitted on time. This indirectly assesses time management.'
      },
      {
        name: 'Steps completed',
        description: 'This criteria assesses whether you completed all parts of a given set of instructions.'
      }
    ]
  },
  'written-statement': {
    slug: 'written-statement',
    name: 'Written Statement',
    assessmentType: 'summative',
    description: 'This assessment measures your ability to communicate your ideas and scope of work fully and professionally.',
    criteria: [
      {
        name: 'Articulation',
        description: 'This measures the ability to synthesize and articulate ideas through a written statement, and to meet the minimum statement requirements. Depending on the associated work, you may be required to talk about what you did, the context of the work in a larger landscape of contemporary or historical work, why the work is interesting, can be considered successful, or what the work may impact.'
      },
      {
        name: 'Writing quality',
        description: 'Language should be clear, understandable, free of hyperbole and generalizations, show specific examples, and reference or cite sources where necessary.'
      },
      {
        name: 'Spelling and grammar',
        description: 'Generally free of spelling mistakes, grammar issues, and missing or incomplete sentences.'
      },
      {
        name: 'On time',
        description: 'This criterion checks to see if the assigned task was submitted on time. This indirectly assesses time management.'
      }
    ]
  }
}

export function useRubrics() {
  /** Get all rubric types */
  const allRubrics = computed(() => Object.values(RUBRICS))

  /** Get a specific rubric by slug (e.g. 'exercise', 'project') */
  function getRubric(slug: string): Rubric | undefined {
    return RUBRICS[slug]
  }

  /** 
   * Get the rubric for a content item based on its type or rubric field.
   * Exercises → exercise rubric, Projects → project rubric, etc.
   */
  function getRubricForContentType(contentType: string, rubricField?: string): Rubric | undefined {
    // Direct rubric field takes priority (from frontmatter)
    if (rubricField && RUBRICS[rubricField]) {
      return RUBRICS[rubricField]
    }
    // Infer from content type
    const typeMap: Record<string, string> = {
      'exercises': 'exercise',
      'exercise': 'exercise',
      'projects': 'project',
      'project': 'project',
      'oer:Assessment': 'project',
    }
    const slug = typeMap[contentType]
    return slug ? RUBRICS[slug] : undefined
  }

  /**
   * Format rubric criteria as a readable string for LLM prompts.
   * Returns a formatted block with rubric name, description, and all criteria.
   */
  function formatRubricForPrompt(rubric: Rubric): string {
    const criteriaList = rubric.criteria
      .map((c, i) => `${i + 1}. **${c.name}**: ${c.description}`)
      .join('\n')

    return `📋 RUBRIC: ${rubric.name} (${rubric.assessmentType} assessment)
${rubric.description}

Grading Criteria:
${criteriaList}`
  }

  /**
   * Format all rubrics as a summary for the LLM to reference.
   */
  function formatAllRubricsForPrompt(): string {
    return Object.values(RUBRICS)
      .map(r => formatRubricForPrompt(r))
      .join('\n\n---\n\n')
  }

  return {
    allRubrics,
    getRubric,
    getRubricForContentType,
    formatRubricForPrompt,
    formatAllRubricsForPrompt
  }
}
