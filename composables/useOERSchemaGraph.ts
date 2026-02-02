import type { Ref } from 'vue';

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  description?: string;
  url?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface OERSchemaItem {
  '@type': string | string[];
  '@id'?: string;
  '@context'?: any;
  name?: string;
  description?: string;
  url?: string;
  teaches?: string | string[];
  hasLearningObjective?: Array<{ '@id': string }>;
  coursePrerequisites?: string | string[] | Array<{ name: string; url?: string }>;
  hasCourseInstance?: string | string[] | Array<{ '@type': string; name: string; url?: string }>;
  hasComponent?: Array<any>;
  isPartOf?: string | { '@type': string; name: string; url?: string };
  learningResourceType?: string;
}

// Node colors by type
const typeColors: Record<string, string> = {
  'Course': '#3b82f6',           // blue
  'LearningComponent': '#8b5cf6', // purple
  'Lesson': '#10b981',           // green
  'Practice': '#f59e0b',         // orange
  'Assessment': '#ef4444',       // red
  'Tutorial': '#06b6d4',         // cyan
  'SupportingMaterial': '#ec4899', // pink
  'CreativeWork': '#64748b',     // slate
  'InstructionalPattern': '#f59e0b', // orange (similar to Practice)
  'LearningObjective': '#10b981', // green
  'Objective': '#10b981',        // green
  'Rubric': '#8b5cf6',           // purple
  'Component': '#6b7280',        // gray
  'Prerequisite': '#6b7280',     // gray
};

export const useOERSchemaGraph = () => {
  const graphData: Ref<GraphData> = ref({ nodes: [], edges: [] });
  const isLoading = ref(false);

  /**
   * Get type color
   */
  const getTypeColor = (type: string): string => {
    return typeColors[type] || '#9ca3af';
  };

  /**
   * Extract node type from @type
   */
  const extractType = (typeValue: string | string[]): string => {
    if (Array.isArray(typeValue)) {
      // Prefer specific types over CreativeWork
      const specificType = typeValue.find(t => t !== 'CreativeWork');
      return (specificType || typeValue[0] || 'CreativeWork').replace('oer:', '').replace('schema:', '');
    }
    return typeValue.replace('oer:', '').replace('schema:', '');
  };

  /**
   * Create a node from schema item
   */
  const createNode = (schema: OERSchemaItem, index: number): GraphNode => {
    const type = extractType(schema['@type']);
    const id = schema['@id'] || schema.url || `node-${index}`;
    const label = schema.name || type;
    
    return {
      id,
      label,
      type,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      color: getTypeColor(type),
      description: schema.description,
      url: schema.url,
    };
  };

  /**
   * Parse OER Schema from current page
   */
  const parseCurrentPageSchema = (): GraphData => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeMap = new Map<string, GraphNode>();

    // Find all OER Schema JSON-LD scripts
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    console.log('[useOERSchemaGraph] Found scripts:', scripts.length);
    
    scripts.forEach((script, index) => {
      try {
        const content = script.textContent || '{}';
        console.log('[useOERSchemaGraph] Script content:', content.substring(0, 200));
        const schema = JSON.parse(content) as OERSchemaItem;
        console.log('[useOERSchemaGraph] Parsed schema:', {
          type: schema['@type'],
          name: schema.name,
          hasPrerequisites: !!schema.coursePrerequisites,
          hasTeaches: !!schema.teaches,
          hasCourseInstance: !!schema.hasCourseInstance
        });
        
        // Create main node
        const node = createNode(schema, index);
        nodes.push(node);
        nodeMap.set(node.id, node);

        // Parse relationships
        
        // Prerequisites
        if (schema.coursePrerequisites) {
          const prerequisites = Array.isArray(schema.coursePrerequisites) 
            ? schema.coursePrerequisites 
            : [schema.coursePrerequisites];
            
          prerequisites.forEach((prereq, i) => {
            if (typeof prereq === 'string') {
              // String prerequisite
              const prereqId = `prerequisite-${index}-${i}`;
              if (!nodeMap.has(prereqId)) {
                const prereqNode: GraphNode = {
                  id: prereqId,
                  label: prereq,
                  type: 'Prerequisite',
                  x: 0,
                  y: 0,
                  vx: 0,
                  vy: 0,
                  color: '#6b7280',
                  description: 'Prerequisite',
                };
                nodes.push(prereqNode);
                nodeMap.set(prereqId, prereqNode);
              }
              
              edges.push({
                source: prereqId,
                target: node.id,
                type: 'prerequisite',
              });
            } else if (typeof prereq === 'object' && prereq.name) {
              // Object prerequisite
              const prereqId = prereq.url || `prerequisite-${index}-${i}`;
              if (!nodeMap.has(prereqId)) {
                const prereqNode: GraphNode = {
                  id: prereqId,
                  label: prereq.name,
                  type: 'Prerequisite',
                  x: 0,
                  y: 0,
                  vx: 0,
                  vy: 0,
                  color: '#6b7280',
                  description: 'Prerequisite',
                  url: prereq.url,
                };
                nodes.push(prereqNode);
                nodeMap.set(prereqId, prereqNode);
              }
              
              edges.push({
                source: prereqId,
                target: node.id,
                type: 'prerequisite',
              });
            }
          });
        }

        // Learning Objectives (teaches)
        if (schema.teaches) {
          const objectives = Array.isArray(schema.teaches) ? schema.teaches : [schema.teaches];
          
          objectives.forEach((objective, i) => {
            const objectiveId = `objective-${index}-${i}`;
            if (!nodeMap.has(objectiveId)) {
              const objectiveNode: GraphNode = {
                id: objectiveId,
                label: objective,
                type: 'Objective',
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                color: '#10b981',
                description: objective,
              };
              nodes.push(objectiveNode);
              nodeMap.set(objectiveId, objectiveNode);
            }
            
            edges.push({
              source: node.id,
              target: objectiveId,
              type: 'objective',
            });
          });
        }

        // Learning Objectives (hasLearningObjective - for exercises/projects)
        if (schema.hasLearningObjective && Array.isArray(schema.hasLearningObjective)) {
          schema.hasLearningObjective.forEach((objRef, i) => {
            const objectiveId = objRef['@id'] || `objective-${index}-${i}`;
            if (!nodeMap.has(objectiveId)) {
              const objectiveNode: GraphNode = {
                id: objectiveId,
                label: `Learning Objective ${i + 1}`,
                type: 'Objective',
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                color: '#10b981',
                description: 'Learning Objective',
              };
              nodes.push(objectiveNode);
              nodeMap.set(objectiveId, objectiveNode);
            }
            
            edges.push({
              source: node.id,
              target: objectiveId,
              type: 'objective',
            });
          });
        }

        // Components (hasComponent - for InstructionalPattern, etc.)
        if (schema.hasComponent && Array.isArray(schema.hasComponent)) {
          schema.hasComponent.forEach((component, i) => {
            const componentId = component['@id'] || `component-${index}-${i}`;
            const componentType = typeof component['@type'] === 'string' 
              ? component['@type'].replace('oer:', '') 
              : 'Component';
            
            if (!nodeMap.has(componentId)) {
              const componentNode: GraphNode = {
                id: componentId,
                label: component.name || componentType,
                type: componentType,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                color: getTypeColor(componentType),
                description: component.description || component.materialType,
              };
              nodes.push(componentNode);
              nodeMap.set(componentId, componentNode);
            }
            
            edges.push({
              source: node.id,
              target: componentId,
              type: 'hasComponent',
            });
          });
        }

        // Course Instances
        if (schema.hasCourseInstance) {
          const instances = Array.isArray(schema.hasCourseInstance) 
            ? schema.hasCourseInstance 
            : [schema.hasCourseInstance];
            
          instances.forEach((instance, i) => {
            if (typeof instance === 'object' && instance.name) {
              const instanceId = instance.url || `instance-${index}-${i}`;
              if (!nodeMap.has(instanceId)) {
                const instanceNode: GraphNode = {
                  id: instanceId,
                  label: instance.name,
                  type: instance['@type'] || 'CourseInstance',
                  x: 0,
                  y: 0,
                  vx: 0,
                  vy: 0,
                  color: getTypeColor(instance['@type'] || 'CourseInstance'),
                  url: instance.url,
                };
                nodes.push(instanceNode);
                nodeMap.set(instanceId, instanceNode);
              }
              
              edges.push({
                source: node.id,
                target: instanceId,
                type: 'hasCourseInstance',
              });
            }
          });
        }

        // Part Of
        if (schema.isPartOf) {
          const partOf = schema.isPartOf;
          if (typeof partOf === 'object' && partOf.name) {
            const partOfId = partOf.url || `parent-${index}`;
            if (!nodeMap.has(partOfId)) {
              const partOfNode: GraphNode = {
                id: partOfId,
                label: partOf.name,
                type: partOf['@type'] || 'Course',
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                color: getTypeColor(partOf['@type'] || 'Course'),
                url: partOf.url,
              };
              nodes.push(partOfNode);
              nodeMap.set(partOfId, partOfNode);
            }
            
            edges.push({
              source: partOfId,
              target: node.id,
              type: 'isPartOf',
            });
          }
        }

      } catch (error) {
        console.error('Error parsing OER Schema:', error);
      }
    });

    return { nodes, edges };
  };

  /**
   * Fetch related content from workspace
   */
  const fetchRelatedContent = async (currentUrl: string): Promise<GraphData> => {
    try {
      isLoading.value = true;
      
      // Parse current page schema
      const localData = parseCurrentPageSchema();
      
      // In a full implementation, you would also:
      // 1. Query your content API for related items
      // 2. Fetch OER Schema from related pages
      // 3. Build a complete graph
      
      // For now, we'll use the local data
      return localData;
      
    } catch (error) {
      console.error('Error fetching related content:', error);
      return { nodes: [], edges: [] };
    } finally {
      isLoading.value = false;
    }
  };

  return {
    graphData,
    isLoading,
    parseCurrentPageSchema,
    fetchRelatedContent,
  };
};
