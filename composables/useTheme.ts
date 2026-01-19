import { useColorMode } from '@vueuse/core'

export const useTheme = () => {
  const mode = useColorMode({
    attribute: 'class',
    modes: {
      light: 'light',
      dark: 'dark',
    },
  })

  const toggleTheme = () => {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
  }

  const isDark = computed(() => mode.value === 'dark')

  return {
    mode,
    isDark,
    toggleTheme,
  }
}
