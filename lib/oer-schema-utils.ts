/**
 * OER Schema Utilities
 * Functions for extracting structured data from markdown content
 */

/**
 * Convert Nuxt Content parsed body to plain text
 */
function contentToText(content: any): string {
  if (typeof content === 'string') return content;
  if (!content || !content.body) return '';
  
  // Recursively extract text from parsed content nodes
  function extractText(node: any): string {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.type === 'text') return node.value || '';
    if (node.children && Array.isArray(node.children)) {
      return node.children.map(extractText).join('\n');
    }
    return '';
  }
  
  return extractText(content.body);
}

/**
 * Extract Learning Objectives section from markdown or parsed content
 */
export function extractLearningObjectives(content: any): string[] {
  const text = contentToText(content);
  if (!text) return [];
  
  const match = text.match(/## Learning Objectives\n\n([\s\S]*?)(?=\n##|$)/);
  if (!match || !match[1]) return [];
  
  return match[1]
    .split('\n')
    .filter(line => line.match(/^\d+\./))
    .map(line => line.replace(/^\d+\.\s*/, '').trim());
}

/**
 * Extract Instructions section
 */
export function extractInstructions(content: any): string[] {
  const text = contentToText(content);
  if (!text) return [];
  
  const match = text.match(/## Instructions\n\n([\s\S]*?)(?=\n##|$)/);
  if (!match || !match[1]) return [];
  
  return match[1]
    .split('\n')
    .filter(line => line.match(/^\d+\./))
    .map(line => line.replace(/^\d+\.\s*/, '').trim());
}

/**
 * Extract YouTube playlist ID from iframe component
 */
export function extractYouTubePlaylist(content: any): string | null {
  const text = contentToText(content);
  if (!text) return null;
  
  const match = text.match(/::iframe-component[\s\S]*?src:\s*https:\/\/youtube\.com\/embed\/videoseries\?list=([\w-]+)/);
  return match && match[1] ? match[1] : null;
}

/**
 * Parse hierarchical instructions with sections (pre-production, production, etc.)
 */
export function parseTaskSections(content: any): Array<{
  name: string;
  steps: string[];
}> {
  const sections: Array<{ name: string; steps: string[] }> = [];
  const text = contentToText(content);
  if (!text) return sections;
  
  // Match ### headings within Instructions section
  const instructionsMatch = text.match(/## Instructions\n\n([\s\S]*?)(?=\n## [^#]|$)/);
  if (!instructionsMatch || !instructionsMatch[1]) return sections;
  
  const instructionsText = instructionsMatch[1];
  const sectionRegex = /### (.+?)\n([\s\S]*?)(?=\n###|$)/g;
  
  let match;
  while ((match = sectionRegex.exec(instructionsText)) !== null) {
    if (!match[1] || !match[2]) continue;
    const sectionName = match[1].trim();
    const sectionContent = match[2];
    
    const steps = sectionContent
      .split('\n')
      .filter(line => line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').replace(/\*\*(.+?)\*\*/, '$1').trim());
    
    if (steps.length > 0) {
      sections.push({ name: sectionName, steps });
    }
  }
  
  return sections;
}

/**
 * Infer ActionTypes from content based on keywords
 */
export function inferActionTypes(content: string): string[] {
  const types: Set<string> = new Set();
  const lower = content.toLowerCase();
  
  if (lower.match(/watch|view|observe|examine/)) types.add('Observing');
  if (lower.match(/create|model|render|build|animate|design|make/)) types.add('Making');
  if (lower.match(/write|document/)) types.add('Writing');
  if (lower.match(/read|review/)) types.add('Reading');
  if (lower.match(/research|investigate|find|explore/)) types.add('Researching');
  if (lower.match(/present|share|upload|submit/)) types.add('Presenting');
  if (lower.match(/reflect|consider|think/)) types.add('Reflecting');
  if (lower.match(/listen|hear/)) types.add('Listening');
  
  return Array.from(types);
}

/**
 * Get Creative Commons license URL from short form
 */
export function getLicenseUrl(license: string): string {
  const map: Record<string, string> = {
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC BY-NC-SA 4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    'CC BY-ND 4.0': 'https://creativecommons.org/licenses/by-nd/4.0/',
    'CC BY-NC-ND 4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  };
  return map[license] || license;
}

/**
 * Get AIUL (AI Usage License) URL from license tag
 */
export function getAIULUrl(license: string): string {
  // Handle full license tags like "AIUL-NA-WR" by extracting base tag
  const baseMatch = license.match(/^(AIUL-[A-Z]{2})/);
  const baseTag = baseMatch ? baseMatch[1] : license;
  
  const map: Record<string, string> = {
    'AIUL-NA': 'https://dmd-program.github.io/aiul/licenses/na/1.0.0/',
    'AIUL-WA': 'https://dmd-program.github.io/aiul/licenses/wa/1.0.0/',
    'AIUL-CD': 'https://dmd-program.github.io/aiul/licenses/cd/1.0.0/',
    'AIUL-TC': 'https://dmd-program.github.io/aiul/licenses/tc/1.0.0/',
    'AIUL-DP': 'https://dmd-program.github.io/aiul/licenses/dp/1.0.0/',
    'AIUL-IU': 'https://dmd-program.github.io/aiul/licenses/iu/1.0.0/',
  };
  
  return map[baseTag] || `https://dmd-program.github.io/aiul/licenses.html`;
}

/**
 * Parse duration from text (e.g., "30 seconds", "8 weeks")
 */
export function parseDuration(text: any): string | null {
  // Handle non-string input
  if (typeof text !== 'string' || !text) return null;
  
  const secondsMatch = text.match(/(\d+)\s*seconds?/i);
  if (secondsMatch) return `PT${secondsMatch[1]}S`;
  
  const minutesMatch = text.match(/(\d+)\s*minutes?/i);
  if (minutesMatch) return `PT${minutesMatch[1]}M`;
  
  const hoursMatch = text.match(/(\d+)\s*hours?/i);
  if (hoursMatch) return `PT${hoursMatch[1]}H`;
  
  const weeksMatch = text.match(/(\d+)\s*weeks?/i);
  if (weeksMatch) return `PT${weeksMatch[1]}W`;
  
  return null;
}
