<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

interface Props {
  license: string | string[]
}

const props = defineProps<Props>()

// Track expanded state for each license by index
const expandedStates = ref<Record<number, boolean>>({})

// Normalize license to always be an array
const licenses = computed(() => 
  Array.isArray(props.license) ? props.license : [props.license]
)

const toggleExpanded = (index: number) => {
  expandedStates.value[index] = !expandedStates.value[index]
}

// AIUL license definitions
const aiulLicenses = {
  'AIUL-NA': {
    fullName: 'No AI',
    description: 'Use of AI is not allowed',
    url: 'https://dmd-program.github.io/aiul/licenses.html#na',
    color: 'text-red-700 dark:text-red-400'
  },
  'AIUL-WA': {
    fullName: 'With Approval',
    description: 'AI use requires explicit instructor approval',
    url: 'https://dmd-program.github.io/aiul/licenses.html#wa',
    color: 'text-orange-700 dark:text-orange-400'
  },
  'AIUL-CD': {
    fullName: 'Conceptual Development',
    description: 'AI may be used for brainstorming and ideation, but not for final execution',
    url: 'https://dmd-program.github.io/aiul/licenses.html#cd',
    color: 'text-yellow-700 dark:text-yellow-400'
  },
  'AIUL-TC': {
    fullName: 'Transparency & Citation',
    description: 'AI may be used if all usage is documented and properly cited',
    url: 'https://dmd-program.github.io/aiul/licenses.html#tc',
    color: 'text-blue-700 dark:text-blue-400'
  },
  'AIUL-DP': {
    fullName: 'Draft & Prototyping',
    description: 'AI may be used for drafts and prototyping, but not for final submissions',
    url: 'https://dmd-program.github.io/aiul/licenses.html#dp',
    color: 'text-cyan-700 dark:text-cyan-400'
  },
  'AIUL-IU': {
    fullName: 'Informed Use',
    description: 'AI may be used freely, but you must be able to explain and justify all AI-assisted work',
    url: 'https://dmd-program.github.io/aiul/licenses.html#iu',
    color: 'text-green-700 dark:text-green-400'
  }
}

// Media suffix descriptions
const mediaSuffixes: Record<string, string> = {
  '-WR': 'Writing',
  '-IM': 'Image',
  '-VD': 'Video',
  '-AU': 'Audio',
  '-3D': '3D Production',
  '-TR': 'Translation',
  '-MX': 'Mixed Media',
  '-CO': 'Code'
}

// Pedagogical guidance data
const guidesData: Record<string, {
  allowed: string[]
  notAllowed: string[]
  tips: string[]
}> = {
  'AIUL-NA': {
    allowed: [
      'Your own original ideas and creative work',
      'Traditional research methods using non-AI sources',
      'Manual techniques and tools specific to your medium',
      'Consultation with instructors and peers'
    ],
    notAllowed: [
      'ChatGPT, Claude, Gemini, or other text generation tools',
      'Midjourney, DALL-E, Stable Diffusion, or other image generation tools',
      'Any AI-powered coding assistants',
      'AI translation, writing enhancement, or grammar tools beyond basic spell-check'
    ],
    tips: [
      'Focus on developing your fundamental skills',
      'This is an opportunity to build confidence in your own abilities',
      'Document your process to demonstrate original work',
      'Seek human feedback throughout your process'
    ]
  },
  'AIUL-WA': {
    allowed: [
      'AI tools explicitly approved by your instructor for this specific assignment',
      'Approved AI usage with proper documentation',
      'AI assistance for approved portions of the project only'
    ],
    notAllowed: [
      'Any AI tool not explicitly approved by your instructor',
      'Using AI beyond the scope of what was approved',
      'Failing to document approved AI usage'
    ],
    tips: [
      'Request approval BEFORE using any AI tool',
      'Be specific about which tool and how you plan to use it',
      'Document all approved AI usage in your submission',
      'If unsure, ask first—better to check than apologize later'
    ]
  },
  'AIUL-CD': {
    allowed: [
      'AI for brainstorming and generating initial ideas',
      'AI to explore different conceptual approaches',
      'AI for research and gathering inspiration',
      'AI to create mood boards or concept sketches you won\'t directly use'
    ],
    notAllowed: [
      'Using AI-generated content in your final submission',
      'Incorporating AI-created assets directly into your work',
      'Having AI write, design, or create the final deliverable'
    ],
    tips: [
      'Use AI as a thinking partner, not a production tool',
      'Treat AI outputs as starting points that inspire your original work',
      'Your final work should be clearly your own creation',
      'Document how AI-assisted brainstorming influenced your direction'
    ]
  },
  'AIUL-TC': {
    allowed: [
      'Any AI tool as long as usage is fully documented',
      'AI assistance at any stage of your work',
      'Multiple AI tools if all are properly cited'
    ],
    notAllowed: [
      'Using AI without documenting which tool, when, and how',
      'Failing to distinguish AI-generated content from your own work',
      'Insufficient detail in your AI usage documentation'
    ],
    tips: [
      'Keep a log of every AI interaction as you work',
      'Include: tool name, date/time, prompts used, and what you kept',
      'Be transparent about what AI generated vs. what you created',
      'Create a dedicated "AI Usage" section in your documentation'
    ]
  },
  'AIUL-DP': {
    allowed: [
      'AI for creating rough drafts and initial versions',
      'AI for rapid prototyping and testing ideas',
      'AI to generate placeholder content',
      'AI for iterative refinement of concepts'
    ],
    notAllowed: [
      'Submitting AI-generated content as final work',
      'Using AI for the final polish or finishing touches',
      'Incorporating AI output directly in your final deliverable'
    ],
    tips: [
      'Use AI to quickly iterate and explore options',
      'Your final submission must be substantially reworked from any AI drafts',
      'AI drafts should be stepping stones, not destinations',
      'Show clear progression from AI-assisted draft to human-crafted final work'
    ]
  },
  'AIUL-IU': {
    allowed: [
      'Any AI tool at any stage of your work',
      'AI for efficiency, enhancement, or creative exploration',
      'Combining AI outputs with your own work',
      'Using AI to augment your skills and abilities'
    ],
    notAllowed: [
      'Being unable to explain your AI usage choices',
      'Submitting work you don\'t understand',
      'Blindly accepting AI output without critical evaluation'
    ],
    tips: [
      'Be prepared to discuss and defend your AI usage decisions',
      'Understand everything AI contributes to your work',
      'Use AI strategically to achieve specific goals',
      'Consider: Why this tool? Why this way? What did you learn?'
    ]
  }
}

// Process all licenses with their guidance
const licenseDetails = computed(() => {
  return licenses.value.map(lic => {
    // Get the base license tag (e.g., "AIUL-NA" from "AIUL-NA-WR")
    const match = lic.match(/^(AIUL-[A-Z]{2})/)
    const baseTag = match ? match[1] : lic
    
    // Get media suffix if present (e.g., "-WR", "-3D")
    const suffixMatch = lic.match(/AIUL-[A-Z]{2}(-[A-Z0-9]{2,3})$/)
    const mediaSuffix = suffixMatch ? suffixMatch[1] : null
    
    const tag = baseTag as keyof typeof aiulLicenses
    const baseInfo = aiulLicenses[tag]
    const media = mediaSuffix ? mediaSuffixes[mediaSuffix] : null
    
    // Append media type to description if media suffix is present
    let info = baseInfo
    if (mediaSuffix && media) {
      info = {
        ...baseInfo,
        description: `${baseInfo.description} for the following media: ${media}`
      }
    }
    
    // Get guidance for this license
    const base = baseTag as keyof typeof guidesData
    const baseGuidance = guidesData[base] || guidesData['AIUL-NA']
    
    // If there's a media suffix, customize the guidance to be media-specific
    let guidance = baseGuidance
    if (mediaSuffix && media && baseGuidance) {
      const mediaLower = media.toLowerCase()
      guidance = {
        allowed: baseGuidance.allowed.map(item => 
          item.replace(/this assignment/gi, `the ${mediaLower} portion of this assignment`)
            .replace(/any part of this assignment/gi, `the ${mediaLower} work`)
            .replace(/your work/gi, `your ${mediaLower} work`)
            .replace(/the project/gi, `the ${mediaLower} portion`)
            .replace(/final deliverable/gi, `final ${mediaLower} deliverable`)
        ),
        notAllowed: baseGuidance.notAllowed.map(item => 
          item.replace(/this assignment/gi, `the ${mediaLower} portion of this assignment`)
            .replace(/any part of this assignment/gi, `the ${mediaLower} work`)
            .replace(/your work/gi, `your ${mediaLower} work`)
            .replace(/the project/gi, `the ${mediaLower} portion`)
            .replace(/final deliverable/gi, `final ${mediaLower} deliverable`)
        ),
        tips: baseGuidance.tips.map(item => 
          item.replace(/this assignment/gi, `the ${mediaLower} portion of this assignment`)
            .replace(/your work/gi, `your ${mediaLower} work`)
            .replace(/the project/gi, `the ${mediaLower} portion`)
            .replace(/final work/gi, `final ${mediaLower} work`)
        )
      }
    }
    
    return {
      original: lic,
      baseTag,
      mediaSuffix,
      info,
      mediaType: media,
      guidance
    }
  })
})
</script>

<template>
  <div v-if="licenseDetails.length > 0" class="mt-8 pt-6 border-t space-y-6">
    <!-- Each license gets its own section -->
    <div 
      v-for="(detail, index) in licenseDetails" 
      :key="detail.original"
      class="flex items-start gap-3"
    >
      <!-- AI Icon -->
      <svg 
        class="h-5 w-5 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" 
        fill="currentColor" 
        viewBox="0 0 24 24"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v-2h-2v2zm0-3h2V7h-2v6z"/>
      </svg>
      
      <div class="flex-1">
        <div class="flex items-baseline gap-2 flex-wrap">
          <span class="text-sm font-semibold text-foreground">AI Usage License:</span>
          <a 
            :href="detail.info.url" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="text-sm font-bold hover:underline transition-colors"
            :class="detail.info.color"
          >
            {{ detail.original }}
          </a>
          <span v-if="detail.mediaType" class="text-xs text-muted-foreground">
            ({{ detail.mediaType }})
          </span>
        </div>
        
        <p class="text-sm text-muted-foreground mt-1 leading-relaxed">
          <strong :class="detail.info.color">{{ detail.info.fullName }}:</strong> {{ detail.info.description }}
        </p>
        
        <!-- Collapsible Guidance Section for this license -->
        <div class="mt-3">
          <button
            @click="toggleExpanded(index)"
            class="flex items-center gap-2 text-xs font-medium text-primary hover:underline transition-colors"
          >
            <ChevronDown 
              class="h-3 w-3 transition-transform duration-200"
              :class="{ 'rotate-180': expandedStates[index] }"
            />
            {{ expandedStates[index] ? 'Hide' : 'Show' }} detailed guidance
          </button>
          
          <div 
            v-if="expandedStates[index]"
            class="mt-3 p-4 rounded-lg bg-muted/50 space-y-4 text-sm"
          >
            <!-- What's Allowed -->
            <div>
              <h4 class="font-semibold text-foreground mb-2 flex items-center gap-2">
                <svg class="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                What's Allowed
              </h4>
              <ul class="space-y-1 text-muted-foreground">
                <li v-for="item in detail.guidance?.allowed || []" :key="item" class="flex items-start gap-2">
                  <span class="text-green-600 dark:text-green-400 mt-0.5">•</span>
                  <span>{{ item }}</span>
                </li>
              </ul>
            </div>
            
            <!-- What's Not Allowed -->
            <div>
              <h4 class="font-semibold text-foreground mb-2 flex items-center gap-2">
                <svg class="h-4 w-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                What's Not Allowed
              </h4>
              <ul class="space-y-1 text-muted-foreground">
                <li v-for="item in detail.guidance?.notAllowed || []" :key="item" class="flex items-start gap-2">
                  <span class="text-red-600 dark:text-red-400 mt-0.5">•</span>
                  <span>{{ item }}</span>
                </li>
              </ul>
            </div>
            
            <!-- Tips -->
            <div>
              <h4 class="font-semibold text-foreground mb-2 flex items-center gap-2">
                <svg class="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Tips for Success
              </h4>
              <ul class="space-y-1 text-muted-foreground">
                <li v-for="item in detail.guidance?.tips || []" :key="item" class="flex items-start gap-2">
                  <span class="text-blue-600 dark:text-blue-400 mt-0.5">💡</span>
                  <span>{{ item }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
