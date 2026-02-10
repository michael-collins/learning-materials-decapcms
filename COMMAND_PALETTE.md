# Command Palette - Terminal-Like Navigation

## Overview

The command palette provides a keyboard-first, accessible way to quickly navigate through learning materials and tools without needing to parse HTML layouts or use a mouse. This is beneficial for both keyboard power users and users relying on assistive technologies.

## Features

### ✨ **Quick Access**
- **`Cmd/Ctrl + K`** or **`Cmd/Ctrl + P`**: Open command palette from anywhere
- **`/`**: Open palette (when not in an input field)
- **`Escape`**: Close palette

### 🔍 **Fuzzy Search**
- Search across all content types: lessons, exercises, projects, pathways, specializations, tutorials, lectures, articles
- Intelligent matching on titles, descriptions, tags, and content types
- Results ranked by relevance

### ⌨️ **Full Keyboard Navigation**
- **`↑` / `↓`**: Navigate through results
- **`Enter`**: Select and navigate to result
- **`Escape`**: Close palette
- No mouse required!

### ♿ **Accessibility Features**
- **Semantic HTML**: Uses proper ARIA roles (`combobox`, `listbox`, `option`)
- **Screen reader support**: All elements properly labeled with `aria-label` and `aria-describedby`
- **Keyboard trap prevention**: Focus management respects standard patterns
- **Live regions**: Result counts announced to screen readers
- **High contrast mode**: Works with system accessibility settings
- **Visible focus indicators**: Clear visual feedback for keyboard navigation
- **No motion dependencies**: Respects `prefers-reduced-motion`

## Usage Examples

### Navigate to Content
1. Press `Cmd/Ctrl + K`
2. Type "modeling" → See all modeling-related lessons
3. Use `↓` to select, `Enter` to open

### Browse by Type
1. Press `/`
2. Type "exercises" → Browse all exercises
3. Or type "pathway" → See learning pathways

### Quick Navigation Commands
Built-in commands (no typing needed after opening palette):
- "home" → Return to homepage
- "lessons" → Browse all lessons
- "exercises" → View practice exercises
- "projects" → View project assignments
- "pathways" → Explore learning paths
- "specializations" → View all specializations

## Implementation Details

### Architecture
- **No external dependencies**: Built on existing Radix Vue components (Dialog)
- **Leverages existing index**: Uses `/semantic-search-index.json` (already built by `scripts/build-search-index.ts`)
- **Shared state**: Global composable (`useCommandPalette`) for programmatic control
- **Client-side only**: Plugin and index loading happen in browser

### Files
```
components/CommandPalette.vue          # Main palette UI component
composables/useCommandPalette.ts       # Global state management
plugins/commandPalette.client.ts       # Global keyboard shortcuts
```

### Extending

#### Add Custom Commands
Edit `staticCommands` in `CommandPalette.vue`:

```typescript
{
  id: 'my-command',
  title: 'My Custom Action',
  description: 'What this does',
  category: 'tools',
  icon: MyIcon,
  action: () => {
    // Your action here
    close()
  },
  keywords: ['keyword1', 'keyword2']
}
```

#### Programmatic Control
```typescript
const { open, close, toggle } = useCommandPalette()

// Open from anywhere
open()
```

## Design Philosophy

This implementation avoids literal terminal emulators (like xterm.js) because:
1. **Accessibility**: HTML semantic elements work better with screen readers
2. **Complexity**: No need for PTY/shell emulation for navigation
3. **Performance**: Lightweight fuzzy search vs. full terminal overhead
4. **UX**: Command palette pattern is familiar to developers (VS Code, GitHub, Slack)

The result is a **terminal-inspired interface** that provides the speed and keyboard-centric workflow of a CLI while maintaining full web accessibility standards.

## Browser Support

Works in all modern browsers with proper keyboard and screen reader support:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Screen readers: NVDA, JAWS, VoiceOver

## Performance

- Index loads once on first open (~10-50KB JSON)
- Fuzzy search runs in <5ms for typical queries
- No network requests after initial load
- Results update as you type with no lag
