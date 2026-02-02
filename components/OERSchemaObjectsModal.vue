<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="close" 
        role="presentation"
      >
        <div 
          class="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-background border border-border rounded-lg shadow-xl overflow-hidden"
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-title"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-4 p-6 border-b border-border bg-background">
            <div class="flex-1">
              <h2 id="modal-title" class="text-2xl font-bold text-foreground">OER Schema Objects</h2>
              <p class="mt-2 text-sm text-muted-foreground">
                Structured metadata for developers and integrations
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              @click="close"
              aria-label="Close modal"
              class="shrink-0"
            >
              <Icon name="lucide:x" class="w-4 h-4" />
            </Button>
          </div>
          
          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6 bg-background">
            <!-- Empty State -->
            <div v-if="schemaObjects.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
              <Icon name="lucide:file-code" class="w-16 h-16 mb-4 text-muted-foreground" />
              <p class="text-muted-foreground">No OER Schema objects found on this page</p>
            </div>

            <!-- Schema Objects -->
            <div v-else class="space-y-6">
              <div
                v-for="(schema, index) in schemaObjects"
                :key="index"
                class="border border-border rounded-lg overflow-hidden bg-card"
              >
                <!-- Object Header -->
                <div class="flex items-center justify-between gap-4 p-4 bg-card border-b border-border">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <Icon name="lucide:file-json" class="w-5 h-5 text-primary shrink-0" />
                    <div class="min-w-0 flex-1">
                      <h3 class="font-semibold text-foreground truncate">
                        {{ schema.name || getTypeName(schema['@type']) }}
                      </h3>
                      <span class="inline-block mt-2 px-2.5 py-0.5 text-xs font-medium rounded-md bg-primary/10 text-primary border border-primary/20">
                        {{ getTypeName(schema['@type']) }}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="copySchema(index)"
                    :aria-label="`Copy ${getTypeName(schema['@type'])} schema`"
                    class="shrink-0"
                  >
                    <Icon 
                      :name="copiedIndex === index ? 'lucide:check' : 'lucide:copy'" 
                      class="w-4 h-4 mr-2" 
                      :class="copiedIndex === index ? 'text-green-600' : ''"
                    />
                    <span>{{ copiedIndex === index ? 'Copied' : 'Copy' }}</span>
                  </Button>
                </div>

                <!-- JSON Code -->
                <div class="relative max-h-96 overflow-auto bg-muted">
                  <pre class="p-4 text-sm leading-relaxed text-foreground font-mono"><code>{{ formatJSON(schema) }}</code></pre>
                </div>

                <!-- Description -->
                <div v-if="schema.description" class="p-4 bg-card border-t border-border">
                  <p class="text-sm text-muted-foreground leading-relaxed">
                    {{ schema.description }}
                  </p>
                </div>

                <!-- Metadata Footer -->
                <div class="flex flex-wrap gap-4 p-4 bg-card border-t border-border text-xs">
                  <div v-if="schema.url" class="flex items-center gap-1.5 text-muted-foreground">
                    <Icon name="lucide:link" class="w-3.5 h-3.5 shrink-0" />
                    <a 
                      :href="schema.url" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      class="hover:text-foreground transition-colors underline"
                    >
                      {{ truncateUrl(schema.url) }}
                    </a>
                  </div>
                  <div v-if="schema.license" class="flex items-center gap-1.5 text-muted-foreground">
                    <Icon name="lucide:shield-check" class="w-3.5 h-3.5 shrink-0" />
                    <span>{{ getLicenseName(schema.license) }}</span>
                  </div>
                  <div v-if="schema.educationalLevel" class="flex items-center gap-1.5 text-muted-foreground">
                    <Icon name="lucide:graduation-cap" class="w-3.5 h-3.5 shrink-0" />
                    <span>{{ schema.educationalLevel }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Info Box -->
            <div class="mt-6 p-4 rounded-lg border border-border bg-card">
              <div class="flex items-start gap-3">
                <Icon name="lucide:info" class="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div class="text-sm">
                  <p class="font-semibold text-foreground mb-1">About OER Schema</p>
                  <p class="text-muted-foreground leading-relaxed">
                    These JSON-LD objects can be used to import learning resources into your LMS, 
                    integrate with educational platforms, or build custom curriculum tools. 
                    <a 
                      href="https://oerschema.org" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      class="font-medium text-primary hover:underline"
                    >
                      Learn more
                    </a>
                  </p>
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
import { ref, watch, nextTick, onUnmounted } from 'vue';
import Button from '~/components/ui/button/Button.vue';
import { useBodyOverflow } from '~/composables/useBodyOverflow';

interface OERSchemaObject {
  '@context'?: any;
  '@type': string | string[];
  '@id'?: string;
  name?: string;
  description?: string;
  url?: string;
  license?: string;
  educationalLevel?: string;
  [key: string]: any;
}

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const schemaObjects = ref<OERSchemaObject[]>([]);
const copiedIndex = ref<number | null>(null);
const { toggle } = useBodyOverflow();

const close = () => {
  emit('close');
};

const getTypeName = (type: string | string[]): string => {
  if (Array.isArray(type)) {
    const oerType = type.find(t => t.includes('oer:') || !t.includes(':'));
    return (oerType || type[0]).replace('oer:', '').replace('schema:', '');
  }
  return type.replace('oer:', '').replace('schema:', '');
};

const getLicenseName = (license: string): string => {
  const match = license.match(/licenses\/(.+?)\//);
  return match ? match[1].toUpperCase() : 'Unknown';
};

const truncateUrl = (url: string): string => {
  if (url.length > 50) {
    return url.substring(0, 47) + '...';
  }
  return url;
};

const formatJSON = (obj: any): string => {
  return JSON.stringify(obj, null, 2);
};

const copySchema = async (index: number) => {
  try {
    const schema = schemaObjects.value[index];
    await navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
    copiedIndex.value = index;
    setTimeout(() => {
      copiedIndex.value = null;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy schema:', err);
  }
};

const loadSchemaObjects = () => {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  const objects: OERSchemaObject[] = [];
  
  scripts.forEach((script) => {
    try {
      const schema = JSON.parse(script.textContent || '{}');
      if (schema['@type']) {
        objects.push(schema);
      }
    } catch (error) {
      console.error('Error parsing OER Schema:', error);
    }
  });
  
  schemaObjects.value = objects;
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    close();
  }
};

watch(() => props.isOpen, async (isOpen) => {
  toggle(isOpen);
  if (isOpen) {
    await nextTick();
    loadSchemaObjects();
    document.addEventListener('keydown', handleKeyDown);
  } else {
    document.removeEventListener('keydown', handleKeyDown);
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
  opacity: 0;
}
</style>


