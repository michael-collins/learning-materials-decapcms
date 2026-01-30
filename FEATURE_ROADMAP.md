# Feature Roadmap

This document tracks the planned features and enhancements for the Learning Materials DecapCMS platform.

---

## 1. De-listing Feature

**Status:** Planned  
**Priority:** TBD

### Description
Implement a de-listing capability to disable UI browsing of certain materials, similar to how YouTube handles unlisted videos.

### Requirements
- Add a `listed` or `visibility` field to content frontmatter (e.g., `public`, `unlisted`, `private`)
- Update collection queries to filter out de-listed content from:
  - Collection listing pages
  - Search results
  - Related content suggestions
- De-listed content should remain accessible via direct URL
- Admin/author view should still show de-listed content with visual indicator

### Technical Considerations
- Update content type schemas (articles, lessons, lectures, etc.)
- Modify query composables to respect visibility settings
- Update DecapCMS config to include visibility field
- Consider versioning implications (can a specific version be de-listed?)

### Related Files
- Content schemas in `/content/`
- Collection components in `/components/`
- Query composables in `/composables/`

---

## 2. Chatbot Query System

**Status:** Planned  
**Priority:** TBD

### Description
Integrate a chatbot-based query system that allows students to ask questions about the materials repository and receive intelligent responses.

### Requirements
- Natural language query interface
- Search across all content types (lessons, lectures, articles, projects, etc.)
- Context-aware responses with links to relevant materials
- Integration with existing content structure and metadata
- Optional: Track common queries for content improvement insights

### Technical Considerations
- Choose chatbot framework/service (e.g., OpenAI API, custom RAG pipeline)
- Implement content indexing for semantic search
- Design UI component for chat interface
- Consider embedding options for external sites
- Privacy and data handling considerations
- Rate limiting and API cost management

### Related Files
- New component: `/components/ChatbotInterface.vue` (or similar)
- New composable: `/composables/useChatbot.ts`
- Possible server API routes: `/server/api/chatbot/`

---

## 3. OER Course Book Publishing System

**Status:** Planned  
**Priority:** TBD

### Description
Create a comprehensive system for publishing OER materials as cohesive course books with multiple export formats and interactive features.

### Requirements

#### 3.1 Table of Contents (TOC) Builder UI
- Visual drag-and-drop interface for organizing content
- Select from existing materials (lessons, lectures, articles, etc.)
- Reorder and nest content hierarchically
- Add custom sections and chapter markers
- Preview TOC structure
- Save and load TOC configurations

#### 3.2 Content Bundling System
- Aggregate selected materials into a unified book structure
- Maintain internal cross-references and links
- Apply consistent styling and branding
- Handle media assets (images, videos, 3D models)
- Version management for book releases

#### 3.3 Export Formats

**Book Website**
- Static site generation for the course book
- Navigation with TOC sidebar
- Responsive design
- Search functionality
- Print-friendly styling

**PDF Export**
- High-quality PDF generation
- Proper pagination and typography
- Include all media (or placeholders)
- Table of contents with page numbers
- Headers/footers with course information

**Embeddable Interactive UI**
- Fully-featured interactive widget
- Can be embedded in external LMS or websites
- Preserves interactive elements (exercises, 3D viewers, etc.)
- Configurable theming to match host site
- Analytics/progress tracking

### Technical Considerations
- Extend existing pathway/specialization concepts or create new "book" content type
- Integrate with existing versioning system
- PDF generation library (e.g., Puppeteer, Playwright, or dedicated PDF service)
- Static site export using Nuxt's generate capabilities
- Embed widget packaging and security considerations
- Build process and CI/CD for publishing
- Storage and hosting for published books
- SCORM/LTI compliance for LMS integration (optional)

### Related Files
- New content type: `/content/books/`
- New components: `/components/BookBuilder.vue`, `/components/BookTOC.vue`
- New composable: `/composables/useBookPublishing.ts`
- New pages: `/pages/books/`, `/pages/book-builder/`
- Export utilities: `/lib/book-export-utils.ts`
- Server API: `/server/api/books/`

### Dependencies
- Existing pathway and specialization systems
- Versioning system (see [VERSIONING_SYSTEM.md](VERSIONING_SYSTEM.md))
- OER Schema implementation (see [OER_SCHEMA_IMPLEMENTATION.md](OER_SCHEMA_IMPLEMENTATION.md))

---

## 4. TBD

**Status:** Placeholder  
**Priority:** TBD

### Description
Future features to be determined based on user feedback and platform evolution.

---

## Implementation Notes

### Prioritization Criteria
- User impact and demand
- Technical complexity and effort required
- Dependencies on other features or infrastructure
- Strategic alignment with OER goals
- Resource availability

### Development Process
1. Detailed specification and design phase
2. Technical spike/proof of concept if needed
3. Implementation in feature branch
4. Testing and quality assurance
5. Documentation and user guides
6. Staged rollout and monitoring

---

## Related Documentation
- [OER Schema Implementation](OER_SCHEMA_IMPLEMENTATION.md)
- [Versioning System](VERSIONING_SYSTEM.md)
- [Pathways Implementation Plan](PATHWAYS_IMPLEMENTATION_PLAN.md)
- [Navigation and Components](NAVIGATION_AND_COMPONENTS.md)

---

*Last Updated: January 30, 2026*
