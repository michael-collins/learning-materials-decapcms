<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="close">
        <div class="modal-container">
          <div class="modal-header">
            <h2 class="text-2xl font-bold">Curriculum Graph</h2>
            <Button variant="ghost" size="sm" @click="close">
              <Icon name="lucide:x" class="w-5 h-5" />
            </Button>
          </div>
          
          <div class="modal-content">
            <div class="graph-controls">
              <div class="control-group">
                <label class="text-sm font-medium">Layout</label>
                <select v-model="layoutType" class="control-select">
                  <option value="force">Force-Directed</option>
                  <option value="hierarchical">Hierarchical</option>
                  <option value="radial">Radial</option>
                </select>
              </div>
              
              <div class="control-group">
                <label class="text-sm font-medium">Show</label>
                <div class="flex gap-2">
                  <label class="flex items-center gap-1 text-xs">
                    <input type="checkbox" v-model="showPrerequisites" class="rounded" />
                    Prerequisites
                  </label>
                  <label class="flex items-center gap-1 text-xs">
                    <input type="checkbox" v-model="showObjectives" class="rounded" />
                    Objectives
                  </label>
                  <label class="flex items-center gap-1 text-xs">
                    <input type="checkbox" v-model="showCourses" class="rounded" />
                    Courses
                  </label>
                </div>
              </div>
              
              <Button variant="outline" size="sm" @click="resetZoom">
                <Icon name="lucide:maximize-2" class="w-4 h-4 mr-1" />
                Reset View
              </Button>
            </div>

            <div ref="graphContainer" class="graph-canvas-container">
              <canvas
                ref="canvas"
                @mousedown="handleMouseDown"
                @mousemove="handleMouseMove"
                @mouseup="handleMouseUp"
                @wheel="handleWheel"
                class="graph-canvas"
              ></canvas>
              
              <div v-if="hoveredNode" class="node-tooltip" :style="tooltipStyle">
                <div class="font-semibold">{{ hoveredNode.label }}</div>
                <div class="text-xs text-gray-600">{{ hoveredNode.type }}</div>
                <div v-if="hoveredNode.description" class="text-xs mt-1">
                  {{ hoveredNode.description }}
                </div>
              </div>
            </div>

            <div class="graph-legend">
              <div class="legend-title">Legend</div>
              <div class="legend-items">
                <div class="legend-item">
                  <div class="legend-color" style="background: #3b82f6;"></div>
                  <span>Pathway</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #8b5cf6;"></div>
                  <span>Specialization</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #10b981;"></div>
                  <span>Lesson/Objective</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #f59e0b;"></div>
                  <span>Exercise/Practice</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #ef4444;"></div>
                  <span>Project</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #06b6d4;"></div>
                  <span>Tutorial</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #ec4899;"></div>
                  <span>Lecture</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #6b7280;"></div>
                  <span>Component</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import Button from '~/components/ui/button/Button.vue';

interface GraphNode {
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

interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const props = defineProps<{
  isOpen: boolean;
  graphData: GraphData;
  currentNodeId?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

// Refs
const canvas = ref<HTMLCanvasElement | null>(null);
const graphContainer = ref<HTMLDivElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);

// Controls
const layoutType = ref<'force' | 'hierarchical' | 'radial'>('force');
const showPrerequisites = ref(true);
const showObjectives = ref(true);
const showCourses = ref(true);

// View state
const transform = ref({ x: 0, y: 0, scale: 1 });
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const hoveredNode = ref<GraphNode | null>(null);
const tooltipStyle = ref({});

// Animation
let animationFrame: number | null = null;

// Node colors by type
const typeColors: Record<string, string> = {
  'Course': '#3b82f6',      // blue
  'LearningComponent': '#8b5cf6', // purple
  'Lesson': '#10b981',      // green
  'Practice': '#f59e0b',    // orange
  'Assessment': '#ef4444',  // red
  'Tutorial': '#06b6d4',    // cyan
  'SupportingMaterial': '#ec4899', // pink
};

// Computed
const filteredGraphData = computed(() => {
  const nodes = [...props.graphData.nodes];
  let edges = [...props.graphData.edges];

  if (!showPrerequisites.value) {
    edges = edges.filter(e => e.type !== 'prerequisite');
  }
  if (!showObjectives.value) {
    edges = edges.filter(e => e.type !== 'objective');
  }
  if (!showCourses.value) {
    edges = edges.filter(e => e.type !== 'hasCourseInstance');
  }

  return { nodes, edges };
});

const close = () => {
  emit('close');
};

const resetZoom = () => {
  transform.value = { x: 0, y: 0, scale: 1 };
  initializeNodePositions();
};

// Initialize node positions based on layout type
const initializeNodePositions = () => {
  const nodes = filteredGraphData.value.nodes;
  const width = canvas.value?.width || 800;
  const height = canvas.value?.height || 600;
  const centerX = width / 2;
  const centerY = height / 2;

  if (layoutType.value === 'force') {
    // Random initial positions for force layout
    nodes.forEach(node => {
      node.x = centerX + (Math.random() - 0.5) * width * 0.5;
      node.y = centerY + (Math.random() - 0.5) * height * 0.5;
      node.vx = 0;
      node.vy = 0;
    });
  } else if (layoutType.value === 'hierarchical') {
    // Hierarchical layout
    const levels: Record<string, number> = {};
    const visited = new Set<string>();
    
    // Simple level assignment (could be improved with proper DAG traversal)
    nodes.forEach((node, i) => {
      levels[node.id] = Math.floor(i / 5);
    });
    
    const maxLevel = Math.max(...Object.values(levels));
    nodes.forEach(node => {
      const level = levels[node.id] || 0;
      const nodesAtLevel = nodes.filter(n => levels[n.id] === level);
      const indexAtLevel = nodesAtLevel.indexOf(node);
      
      node.x = (width / (nodesAtLevel.length + 1)) * (indexAtLevel + 1);
      node.y = (height / (maxLevel + 2)) * (level + 1);
      node.vx = 0;
      node.vy = 0;
    });
  } else if (layoutType.value === 'radial') {
    // Radial layout
    const radius = Math.min(width, height) * 0.35;
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
      node.vx = 0;
      node.vy = 0;
    });
  }
};

// Force simulation
const applyForces = () => {
  const nodes = filteredGraphData.value.nodes;
  const edges = filteredGraphData.value.edges;
  
  // Constants
  const repulsionStrength = 5000;
  const attractionStrength = 0.01;
  const damping = 0.9;
  const minDistance = 50;
  
  // Repulsion between all nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeI = nodes[i];
      const nodeJ = nodes[j];
      if (!nodeI || !nodeJ) continue;
      
      const dx = nodeJ.x - nodeI.x;
      const dy = nodeJ.y - nodeI.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      
      if (distance < minDistance) {
        const force = repulsionStrength / (distance * distance);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        nodeI.vx -= fx;
        nodeI.vy -= fy;
        nodeJ.vx += fx;
        nodeJ.vy += fy;
      }
    }
  }
  
  // Attraction along edges
  edges.forEach(edge => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    
    if (source && target) {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      
      const force = distance * attractionStrength;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }
  });
  
  // Apply velocity with damping
  nodes.forEach(node => {
    node.x += node.vx;
    node.y += node.vy;
    node.vx *= damping;
    node.vy *= damping;
  });
};

// Render graph
const render = () => {
  if (!ctx.value || !canvas.value) return;
  
  const width = canvas.value.width;
  const height = canvas.value.height;
  
  // Clear canvas
  ctx.value.clearRect(0, 0, width, height);
  
  // Apply transform
  ctx.value.save();
  ctx.value.translate(transform.value.x, transform.value.y);
  ctx.value.scale(transform.value.scale, transform.value.scale);
  
  const nodes = filteredGraphData.value.nodes;
  const edges = filteredGraphData.value.edges;
  
  // Draw edges
  ctx.value.strokeStyle = '#cbd5e1';
  ctx.value.lineWidth = 1;
  edges.forEach(edge => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    
    if (source && target) {
      ctx.value!.beginPath();
      ctx.value!.moveTo(source.x, source.y);
      ctx.value!.lineTo(target.x, target.y);
      
      // Different line styles for different edge types
      if (edge.type === 'prerequisite') {
        ctx.value!.setLineDash([5, 5]);
        ctx.value!.strokeStyle = '#f59e0b';
      } else if (edge.type === 'objective') {
        ctx.value!.setLineDash([2, 2]);
        ctx.value!.strokeStyle = '#10b981';
      } else {
        ctx.value!.setLineDash([]);
        ctx.value!.strokeStyle = '#cbd5e1';
      }
      
      ctx.value!.stroke();
      ctx.value!.setLineDash([]);
    }
  });
  
  // Draw nodes
  nodes.forEach(node => {
    const radius = node.id === props.currentNodeId ? 12 : 8;
    
    // Node circle
    ctx.value!.beginPath();
    ctx.value!.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.value!.fillStyle = node.color;
    ctx.value!.fill();
    
    // Highlight current node
    if (node.id === props.currentNodeId) {
      ctx.value!.strokeStyle = '#000';
      ctx.value!.lineWidth = 3;
      ctx.value!.stroke();
    }
    
    // Node label
    ctx.value!.fillStyle = '#1f2937';
    ctx.value!.font = '12px sans-serif';
    ctx.value!.textAlign = 'center';
    ctx.value!.textBaseline = 'middle';
    const label = node.label.length > 20 ? node.label.substring(0, 20) + '...' : node.label;
    ctx.value!.fillText(label, node.x, node.y + radius + 12);
  });
  
  ctx.value.restore();
};

// Animation loop
const animate = () => {
  if (layoutType.value === 'force') {
    applyForces();
  }
  render();
  animationFrame = requestAnimationFrame(animate);
};

// Mouse handlers
const getMousePos = (event: MouseEvent) => {
  const rect = canvas.value?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  
  return {
    x: (event.clientX - rect.left - transform.value.x) / transform.value.scale,
    y: (event.clientY - rect.top - transform.value.y) / transform.value.scale,
  };
};

const findNodeAtPosition = (x: number, y: number): GraphNode | null => {
  const nodes = filteredGraphData.value.nodes;
  
  for (const node of nodes) {
    const dx = node.x - x;
    const dy = node.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = node.id === props.currentNodeId ? 12 : 8;
    
    if (distance <= radius) {
      return node;
    }
  }
  
  return null;
};

const handleMouseDown = (event: MouseEvent) => {
  isDragging.value = true;
  dragStart.value = { x: event.clientX - transform.value.x, y: event.clientY - transform.value.y };
};

const handleMouseMove = (event: MouseEvent) => {
  if (isDragging.value) {
    transform.value.x = event.clientX - dragStart.value.x;
    transform.value.y = event.clientY - dragStart.value.y;
  } else {
    const pos = getMousePos(event);
    const node = findNodeAtPosition(pos.x, pos.y);
    
    if (node) {
      hoveredNode.value = node;
      const rect = canvas.value?.getBoundingClientRect();
      if (rect) {
        tooltipStyle.value = {
          left: `${event.clientX - rect.left + 10}px`,
          top: `${event.clientY - rect.top + 10}px`,
        };
      }
    } else {
      hoveredNode.value = null;
    }
  }
};

const handleMouseUp = () => {
  isDragging.value = false;
};

const handleWheel = (event: WheelEvent) => {
  event.preventDefault();
  const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
  transform.value.scale *= scaleFactor;
  transform.value.scale = Math.max(0.1, Math.min(5, transform.value.scale));
};

// Setup canvas
const setupCanvas = () => {
  if (!canvas.value || !graphContainer.value) return;
  
  const container = graphContainer.value;
  canvas.value.width = container.clientWidth;
  canvas.value.height = container.clientHeight;
  ctx.value = canvas.value.getContext('2d');
  
  // Center transform
  transform.value.x = canvas.value.width / 2;
  transform.value.y = canvas.value.height / 2;
};

// Watchers
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    setupCanvas();
    initializeNodePositions();
    
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    animate();
  } else {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }
});

watch(layoutType, () => {
  initializeNodePositions();
});

watch([showPrerequisites, showObjectives, showCourses], () => {
  initializeNodePositions();
});

// Lifecycle
onMounted(() => {
  window.addEventListener('resize', setupCanvas);
});

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
  window.removeEventListener('resize', setupCanvas);
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 2rem;
}

.modal-container {
  background: white;
  border-radius: 0.5rem;
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid rgb(229 231 235);
}

.modal-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 1rem;
}

.graph-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: rgb(249 250 251);
  border-radius: 0.375rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.control-select {
  padding: 0.375rem 0.75rem;
  border: 1px solid rgb(209 213 219);
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.graph-canvas-container {
  position: relative;
  flex: 1;
  background: white;
  border: 1px solid rgb(229 231 235);
  border-radius: 0.375rem;
  overflow: hidden;
}

.graph-canvas {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.graph-canvas:active {
  cursor: grabbing;
}

.node-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.5rem;
  border-radius: 0.25rem;
  pointer-events: none;
  max-width: 200px;
  font-size: 0.875rem;
  z-index: 10;
}

.graph-legend {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: rgb(249 250 251);
  border-radius: 0.375rem;
}

.legend-title {
  font-weight: 600;
  font-size: 0.875rem;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}
</style>
