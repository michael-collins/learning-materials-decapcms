import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export const useSpecializationModal = () => {
  const route = useRoute()
  const router = useRouter()
  
  const selectedSlug = ref<string | null>(null)
  const previousRoute = ref<string | null>(null)
  
  // Computed to check if modal should be open based on URL
  const isModalOpen = computed(() => {
    return !!(route.query.modal || selectedSlug.value)
  })
  
  // Computed to get the current modal slug
  const currentModalSlug = computed(() => {
    return (route.query.modal as string) || selectedSlug.value
  })
  
  const openViewer = (slug: string, fromRoute?: string) => {
    selectedSlug.value = slug
    // Store the current route for returning
    if (fromRoute) {
      previousRoute.value = fromRoute
    }
    // Update URL with modal parameter
    router.push({ query: { ...route.query, modal: slug } })
  }
  
  const closeViewer = (returnToPrevious = true) => {
    selectedSlug.value = null
    
    // Clear URL parameters
    const query = { ...route.query }
    delete query.modal
    delete query.lesson
    delete query.item
    
    if (returnToPrevious && previousRoute.value) {
      // Return to the previous page
      router.push(previousRoute.value)
    } else {
      // Just update the query
      router.replace({ query })
    }
  }
  
  // Sync with URL - use immediate to capture initial state
  watch(() => route.query.modal, (modalSlug) => {
    if (modalSlug && typeof modalSlug === 'string') {
      selectedSlug.value = modalSlug
    } else if (!modalSlug && selectedSlug.value) {
      selectedSlug.value = null
    }
  }, { immediate: true })
  
  return {
    isModalOpen,
    currentModalSlug,
    selectedSlug,
    openViewer,
    closeViewer,
  }
}
