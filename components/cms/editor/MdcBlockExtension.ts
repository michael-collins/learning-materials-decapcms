/**
 * MdcBlockExtension — Custom Tiptap Node that represents MDC component blocks.
 *
 * Matches MDC syntax like `::youtube-video{id="abc" title="Hello"}\n::`
 * and renders them as visual widget blocks via the MdcBlockView node view.
 *
 * The extension:
 * - Stores the component type, parsed props, and raw MDC syntax as node attributes
 * - Serializes back to MDC syntax for markdown export
 * - Uses VueNodeViewRenderer for the interactive widget UI
 */
import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import MdcBlockView from './MdcBlockView.vue'

/** Helper: parse key="value" attribute pairs from an MDC attribute string */
function parseAttrString(attrString: string): Record<string, any> {
  const props: Record<string, any> = {}
  const attrRegex = /(\w+)="([^"]*)"/g
  let attrMatch: RegExpExecArray | null
  while ((attrMatch = attrRegex.exec(attrString)) !== null) {
    const key = attrMatch[1]!
    let value: any = attrMatch[2]
    if (value === 'true') value = true
    else if (value === 'false') value = false
    props[key] = value
  }
  return props
}

// Parse atom MDC block syntax: ::component-name{prop="value" prop2="value2"}\n::
export function parseMdcBlock(mdcRaw: string): { componentType: string; props: Record<string, any> } | null {
  // Match ::component-name{...}\n:: or ::component-name{...}::
  const match = mdcRaw.match(/^::([a-z0-9-]+)\{([^}]*)\}\s*\n?::$/s)
  if (!match) return null
  return { componentType: match[1]!, props: parseAttrString(match[2] || '') }
}

// Parse container MDC block: :::component-name{props}\nbody\n:::
export function parseMdcContainer(mdcRaw: string): { componentType: string; props: Record<string, any>; body: string } | null {
  const match = mdcRaw.match(/^:::([a-z0-9-]+)\{([^}]*)\}\s*\n([\s\S]*?):::\s*$/)
  if (!match) return null
  return {
    componentType: match[1]!,
    props: parseAttrString(match[2] || ''),
    body: (match[3] || '').trim(),
  }
}

/** Known container component names */
export const CONTAINER_COMPONENT_NAMES = [
  'callout', 'accordion', 'card-block', 'figure',
  'columns', 'content-divider', 'spacer',
]

// Known MDC component names (atom + container)
const MDC_COMPONENT_NAMES = [
  'image-component',
  'video-component',
  'iframe-component',
  'code-embed-component',
  'google-slides-component',
  'rubric-component',
  'sketchfab-component',
  'threed-viewer-component',
  'cite-reference',
  // Legacy — still parsed for backwards compatibility
  'youtube-video',
  // Container components
  ...CONTAINER_COMPONENT_NAMES,
]

export const MdcBlockExtension = Node.create({
  name: 'mdcBlock',
  group: 'block',
  atom: true, // Non-editable content (edited via node view)
  draggable: true,

  addAttributes() {
    return {
      componentType: { default: '' },
      mdcProps: { default: '{}' },
      mdcRaw: { default: '' },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-mdc-block]',
        getAttrs: (el) => {
          const element = el as HTMLElement
          return {
            componentType: element.getAttribute('data-component-type') || '',
            mdcProps: element.getAttribute('data-mdc-props') || '{}',
            mdcRaw: element.getAttribute('data-mdc-raw') || '',
          }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-mdc-block': 'true',
      'data-component-type': node.attrs.componentType,
      'data-mdc-props': node.attrs.mdcProps,
      'data-mdc-raw': node.attrs.mdcRaw,
    }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(MdcBlockView as any)
  },

  // Custom storage for markdown serialization
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          // Output the raw MDC syntax
          state.write(node.attrs.mdcRaw || '')
          // closeBlock() is essential — it marks this node as "closed" so
          // prosemirror-markdown inserts a blank line before the next block.
          // Without it, markdown-it treats the following block (e.g. a heading)
          // as part of the HTML block, causing heading `#` chars to be escaped.
          state.closeBlock(node)
        },
        parse: {
          // We handle parsing in the input rules / paste handling instead
        },
      },
    }
  },
})

/**
 * Convert raw MDC syntax string into Tiptap node attributes
 * for inserting into the editor.
 */
export function mdcToNodeAttrs(mdcRaw: string): Record<string, any> | null {
  const trimmed = mdcRaw.trim()

  // Try atom block first
  const parsed = parseMdcBlock(trimmed)
  if (parsed) {
    return {
      componentType: parsed.componentType,
      mdcProps: JSON.stringify(parsed.props),
      mdcRaw: trimmed,
    }
  }

  // Try container block
  const container = parseMdcContainer(trimmed)
  if (container) {
    const propsWithBody = { ...container.props, _body: container.body }
    return {
      componentType: container.componentType,
      mdcProps: JSON.stringify(propsWithBody),
      mdcRaw: trimmed,
    }
  }

  return null
}

export default MdcBlockExtension
