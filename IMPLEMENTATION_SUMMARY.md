# shadcn-vue Documentation Layout Implementation

## ✅ Completed Features

### 1. shadcn-vue Setup
- Installed Tailwind CSS v4 with @tailwindcss/postcss
- Configured components.json for shadcn-vue
- Set up utility functions (cn helper)
- Added CSS variables for theming

### 2. UI Components Created
- **Sidebar Components**: Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton
- **Breadcrumb Components**: Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator
- **Form Components**: Input, Button
- **Table Components**: Table, TableHeader, TableBody, TableRow, TableHead, TableCell

### 3. Layout Structure
- Created `layouts/docs.vue` with collapsible sidebar navigation
- Sidebar includes:
  - Branding header with logo
  - Collapsible content categories (Articles, Tutorials)
  - Navigation menu with active state highlighting

### 4. Page Components
- **CollectionListing.vue**: Displays collection items in a searchable table with:
  - Search/filter functionality
  - Sortable columns (Title, Date, Author, Difficulty)
  - Linked titles
  - Pagination
  
- **CollectionItem.vue**: Shows individual collection items with:
  - Breadcrumb navigation
  - Metadata display (date, author, difficulty)
  - Prose-styled content rendering

### 5. Updated Pages
- **Homepage** (`pages/index.vue`): Updated with Tailwind utility classes
- **Articles pages**: Using CollectionListing and CollectionItem components
- **Tutorials pages**: Using CollectionListing and CollectionItem components
- All pages now use the `docs` layout

## 🎨 Design Features
- Responsive sidebar navigation
- Clean, documentation-style layout
- Search and filter capabilities
- Breadcrumb navigation
- Pagination for large collections
- Active route highlighting
- Hover states and transitions
- Dark mode support (via CSS variables)

## 🚀 Running the Project
```bash
npm run dev
```
Server runs on: http://localhost:3001/

## 📁 Key Files
- `layouts/docs.vue` - Main documentation layout with sidebar
- `components/CollectionListing.vue` - Collection list view
- `components/CollectionItem.vue` - Individual item view
- `components/ui/` - shadcn-vue component library
- `tailwind.config.js` - Tailwind configuration
- `assets/css/tailwind.css` - Global styles and CSS variables

## 🔧 Technologies
- Nuxt 4.2.2
- Nuxt Content 3.11.0
- Tailwind CSS v4
- shadcn-vue components
- radix-vue (UI primitives)
- lucide-vue-next (icons)
