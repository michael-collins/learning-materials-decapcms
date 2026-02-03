<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { Copy, Check, ChevronDown } from 'lucide-vue-next'
import Button from '~/components/ui/button/Button.vue'

interface Props {
  title: string
  author?: string
  authorUrl?: string
  date?: string
  license?: string
  version?: string
  versionStatus?: string
}

const props = defineProps<Props>()

const isDropdownOpen = ref(false)
const copiedFormat = ref<string | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const openUpward = ref(false)

// Check if dropdown should open upward
const checkDropdownPosition = () => {
  if (!dropdownRef.value) return
  
  const rect = dropdownRef.value.getBoundingClientRect()
  const dropdownHeight = 180 // Approximate height of dropdown with 4 items
  
  // Check vertical positioning
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  openUpward.value = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight
}

const generateCitation = (format: 'apa' | 'mla' | 'chicago' | 'bibtex') => {
  const currentYear = new Date().getFullYear()
  let pageUrl = ''
  if (typeof window !== 'undefined') {
    pageUrl = window.location.href
  }
  
  const accessDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const year = props.date ? new Date(props.date).getFullYear() : 'n.d.'
  const authorName = props.author || 'Author Unknown'
  
  // Parse author name for different formats
  let authorLastFirst = authorName
  let authorFirstLast = authorName
  if (authorName.includes(' ')) {
    const nameParts = authorName.split(' ')
    const lastName = nameParts[nameParts.length - 1]
    const firstName = nameParts.slice(0, -1).join(' ')
    authorLastFirst = `${lastName}, ${firstName}`
    authorFirstLast = `${firstName} ${lastName}`
  }
  
  const versionInfo = props.version && props.versionStatus === 'archived' ? ` [Version ${props.version}]` : ''
  
  switch (format) {
    case 'apa':
      // APA 7th edition format
      let apa = `${authorLastFirst}. `
      apa += `(${year}). `
      apa += `${props.title}. `
      if (props.license) {
        apa += `[${props.license}].`
      }
      apa += `${versionInfo} `
      apa += `Retrieved ${accessDate}, from ${pageUrl}`
      return apa
      
    case 'mla':
      // MLA 9th edition format
      let mla = `${authorLastFirst}. `
      mla += `"${props.title}." `
      if (props.license) {
        mla += `${props.license}, `
      }
      if (props.date) {
        const date = new Date(props.date)
        const monthNames = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
        mla += `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}, `
      }
      mla += `${pageUrl}. `
      mla += `Accessed ${accessDate}.`
      return mla
      
    case 'chicago':
      // Chicago 17th edition format (Notes and Bibliography)
      let chicago = `${authorFirstLast}. `
      chicago += `"${props.title}." `
      if (props.license) {
        chicago += `${props.license}. `
      }
      if (props.date) {
        const date = new Date(props.date)
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        chicago += `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}. `
      }
      chicago += `${pageUrl}.`
      return chicago
      
    case 'bibtex':
      // BibTeX format
      const sanitizedTitle = props.title.replace(/[{}]/g, '')
      const key = `${authorName.split(' ')[0].toLowerCase()}${year}${sanitizedTitle.split(' ')[0].toLowerCase()}`
      let bibtex = `@misc{${key},\n`
      bibtex += `  author = {${authorName}},\n`
      bibtex += `  title = {${sanitizedTitle}},\n`
      if (props.date) {
        bibtex += `  year = {${year}},\n`
      }
      if (props.license) {
        bibtex += `  note = {${props.license}},\n`
      }
      bibtex += `  url = {${pageUrl}},\n`
      bibtex += `  urldate = {${new Date().toISOString().split('T')[0]}}\n`
      bibtex += `}`
      return bibtex
      
    default:
      return ''
  }
}

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
  if (isDropdownOpen.value) {
    nextTick(() => checkDropdownPosition())
  }
}

const copyCitation = async (format: 'apa' | 'mla' | 'chicago' | 'bibtex') => {
  try {
    const citation = generateCitation(format)
    await navigator.clipboard.writeText(citation)
    copiedFormat.value = format
    setTimeout(() => {
      copiedFormat.value = null
      isDropdownOpen.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy citation:', err)
  }
}

const formatLabels = {
  apa: 'APA',
  mla: 'MLA',
  chicago: 'Chicago',
  bibtex: 'BibTeX'
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.citation-dropdown')) {
    isDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="dropdownRef" class="citation-dropdown relative inline-block">
    <Button
      @click.stop="toggleDropdown"
      size="sm"
      variant="outline"
      class="gap-2"
      :aria-label="isDropdownOpen ? 'Close citation formats' : 'Copy citation'"
      :aria-expanded="isDropdownOpen"
    >
      <Copy class="w-4 h-4" />
      <span>Copy Citation</span>
      <ChevronDown 
        :class="['w-3 h-3 transition-transform duration-200', isDropdownOpen ? 'rotate-180' : '']"
      />
    </Button>
    
    <Transition name="dropdown">
      <div
        v-if="isDropdownOpen"
        :class="[
          'absolute left-0 w-full bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden',
          openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
        ]"
        @click.stop
      >
        <button
          v-for="format in ['apa', 'mla', 'chicago', 'bibtex'] as const"
          :key="format"
          @click="copyCitation(format)"
          class="w-full flex items-center justify-between px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
          :disabled="copiedFormat === format"
        >
          <span>{{ formatLabels[format] }}</span>
          <Check v-if="copiedFormat === format" class="w-4 h-4 text-green-600 dark:text-green-400" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
