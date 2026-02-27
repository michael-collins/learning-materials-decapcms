/**
 * useMdcLayout — Shared layout prop handling for MDC media components.
 *
 * Provides computed CSS classes for alignment, sizing, and floating
 * based on `align`, `size`, and `float` props.
 */

export interface MdcLayoutProps {
  align?: 'left' | 'center' | 'right' | 'full'
  size?: 'small' | 'medium' | 'large' | 'full'
  float?: 'left' | 'right' | 'none'
}

export function useMdcLayout(props: MdcLayoutProps) {
  const layoutClasses = computed(() => {
    const classes: string[] = []

    // Alignment
    const align = props.align || 'center'
    classes.push(`mdc-align-${align}`)

    // Sizing
    const size = props.size || 'full'
    classes.push(`mdc-size-${size}`)

    // Float (only if align is not full)
    const float = props.float || 'none'
    if (float !== 'none' && align !== 'full') {
      classes.push(`mdc-float-${float}`)
    }

    return classes.join(' ')
  })

  return { layoutClasses }
}
