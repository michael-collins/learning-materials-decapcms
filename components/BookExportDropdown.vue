<script setup lang="ts">
import { Download, FileText, FileArchive, Printer, Globe, ChevronDown, Rocket } from 'lucide-vue-next'
import Button from '~/components/ui/button/Button.vue'
import Popover from '~/components/ui/popover/Popover.vue'
import PopoverTrigger from '~/components/ui/popover/PopoverTrigger.vue'
import PopoverContent from '~/components/ui/popover/PopoverContent.vue'
import { useBookExport } from '~/composables/useBookExport'
import { useGitHubPagesDeploy } from '~/composables/useGitHubPagesDeploy'

const props = defineProps<{
  bookSlug: string
  side?: 'top' | 'bottom' | 'left' | 'right'
}>()

const side = computed(() => props.side ?? 'bottom')

const open = ref(false)
const { exportBook, exportBookPdf, exportBookDocx, exportBookCC, exporting, progress } = useBookExport()
const { openDialog: openDeployDialog } = useGitHubPagesDeploy()

async function handleExport(format: 'html' | 'pdf' | 'docx' | 'cc' | 'ghpages') {
  open.value = false

  if (format === 'ghpages') {
    openDeployDialog(props.bookSlug)
    return
  }

  switch (format) {
    case 'html':
      await exportBook(props.bookSlug)
      break
    case 'pdf':
      await exportBookPdf(props.bookSlug)
      break
    case 'docx':
      await exportBookDocx(props.bookSlug)
      break
    case 'cc':
      await exportBookCC(props.bookSlug)
      break
  }
}

const formats = [
  {
    key: 'html' as const,
    icon: Globe,
    label: 'HTML Website',
    description: 'Standalone site with sidebar & navigation',
    ext: '.zip',
  },
  {
    key: 'pdf' as const,
    icon: Printer,
    label: 'PDF',
    description: 'Print-optimized document with TOC',
    ext: '.pdf',
  },
  {
    key: 'docx' as const,
    icon: FileText,
    label: 'Word Document',
    description: 'Editable .docx with chapters',
    ext: '.docx',
  },
  {
    key: 'cc' as const,
    icon: FileArchive,
    label: 'Common Cartridge',
    description: 'IMS CC 1.3 for LMS import',
    ext: '.imscc',
  },
]

const deployFormat = {
  key: 'ghpages' as const,
  icon: Rocket,
  label: 'GitHub Pages',
  description: 'Deploy as a live website',
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        :disabled="exporting"
        class="gap-1.5"
      >
        <Download class="h-4 w-4" />
        Export
        <ChevronDown class="h-3 w-3 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent :side="side" align="end" class="w-72 p-1.5">
      <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
        Export Book
      </div>
      <button
        v-for="fmt in formats"
        :key="fmt.key"
        class="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted transition-colors"
        :disabled="exporting"
        @click="handleExport(fmt.key)"
      >
        <component :is="fmt.icon" class="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div class="min-w-0">
          <div class="font-medium">{{ fmt.label }} <span class="text-xs text-muted-foreground font-normal">{{ fmt.ext }}</span></div>
          <div class="text-xs text-muted-foreground">{{ fmt.description }}</div>
        </div>
      </button>

      <div class="my-1 border-t" />

      <button
        class="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted transition-colors"
        :disabled="exporting"
        @click="handleExport(deployFormat.key)"
      >
        <component :is="deployFormat.icon" class="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <div class="min-w-0">
          <div class="font-medium">{{ deployFormat.label }}</div>
          <div class="text-xs text-muted-foreground">{{ deployFormat.description }}</div>
        </div>
      </button>
    </PopoverContent>
  </Popover>

  <!-- Export progress toast -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="progress"
        class="fixed bottom-6 right-6 z-50 rounded-lg border bg-card px-4 py-3 shadow-lg text-sm flex items-center gap-3"
      >
        <div v-if="exporting" class="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
        {{ progress }}
      </div>
    </Transition>
  </Teleport>

  <!-- GitHub Pages deploy dialog -->
  <DeployToGitHubPagesDialog />
</template>
