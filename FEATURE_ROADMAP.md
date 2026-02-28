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

**Status:** In Progress  
**Priority:** High

### Description
Integrate a chatbot-based query system that allows students to ask questions about the materials repository and receive intelligent responses.

### Requirements
- Natural language query interface
- Search across all content types (lessons, lectures, articles, projects, etc.)
- Context-aware responses with links to relevant materials
- Integration with existing content structure and metadata
- Improve LLM response grounding and relevance (no hallucinated content, better matching to repository materials)
- Optional: Track common queries for content improvement insights

### Technical Considerations
- Choose chatbot framework/service (e.g., OpenAI API, custom RAG pipeline)
- Implement content indexing for semantic search
- Design UI component for chat interface
- Consider embedding options for external sites
- Prompt/response constraints to keep answers tied to indexed materials
- Relevance tuning, evaluation prompts, and regression test prompts
- Privacy and data handling considerations
- Rate limiting and API cost management

### Implementation Progress

**Completed**
- ✅ Schema-enhanced search index and query scoring
- ✅ Chat UI (popover + fullscreen) with message history
- ✅ Settings for provider/model selection and BYOK storage
- ✅ Server API proxy for provider requests (CORS-safe)

**In Progress**
- 🔄 LLM response grounding and relevance tuning (prompting + retrieval scoring)
- 🔄 Learning plan generation with step-by-step materials and Word export
- 🔄 **Mode-based architecture for specialized guidance** (see section 2.1 below)

**Planned**
- ⏳ Streaming responses
- ⏳ Usage/error analytics for common queries
- ⏳ **Advanced Course Construction AI** (see section 2.2 below)

#### 2.1 Mode-Based Architecture

**Status:** In Progress  
**Description**  
Extensible mode system that provides specialized AI guidance for different learning contexts, similar to GitHub Copilot's agent/ask/edit/plan modes.

**Implemented Modes**

*Ask Mode (Default)*
- General learning assistant
- Material discovery and recommendations
- Quick answers to learning questions

*Plan Mode*
- Structured learning plan generation
- Step-by-step progression with materials
- Time estimates and scheduling
- Word document export

**Guide Modes (Planned)**

*Concept Guide Mode*
- Deep concept exploration and relationships
- Prerequisite identification
- Theory-to-practice connections
- Socratic questioning approach

*Writing Guide Mode*
- Technical and creative writing development
- Genre-specific guidance
- Style and structure templates
- Peer review workflows

*Career Guide Mode*
- Professional development pathways
- Portfolio building guidance
- Industry role mapping
- Skill progression tracking

*Theory Guide Mode*
- Theoretical framework exploration
- Historical context and evolution
- Critical analysis exercises
- Philosophy and principles

**Technical Implementation**
- Mode configuration system with specialized prompts
- Mode-specific analysis and synthesis strategies
- UI mode selector with descriptions
- Persistent mode selection (localStorage)
- Auto-detection based on query patterns
- Integration with existing multi-stage LLM pipeline

**Related Files**
- `/composables/useChatModes.ts` - Mode configuration and management
- `/composables/useLLMChat.ts` - Mode-aware response generation
- `/components/AIChatInterface.vue` - Mode selector UI

#### 2.2 Advanced Course Construction AI

**Description**  
Evolve the chatbot into a comprehensive course construction tool that understands pedagogical context, prerequisites, time constraints, and institutional requirements.

**Capabilities**

*Contextual Analysis*
- Analyze and consider course prerequisites before generating recommendations
- Understand time constraints specified by the user or inferred from context
- Recognize when content is part of a structured course with specific requirements
- Support course skeleton workflows where faculty provide structure and AI fills in materials

*Content Awareness*
- Scan video transcripts and media descriptions for relevant content matching
- Understand pedagogical intention and learning objectives alignment
- Identify gaps in content coverage and recommend additions
- Link to contribution instructions when relevant content is missing from the platform

*Interactive Guidance*
- Ask clarifying questions to better understand user needs
- Guide users through course construction workflows step-by-step
- Provide recommendations based on educational best practices
- Support iterative refinement of course plans

*Export & Integration*
- Generate Common Cartridge (IMS CC) exports for LMS import
- Support SCORM packaging for course materials
- Export complete course structures with materials, assessments, and metadata
- Integration with institutional LMS systems

**Technical Considerations**
- Course skeleton data structure and storage (possibly new content type)
- Video transcript indexing and semantic search
- Pedagogical rule engine and constraint satisfaction
- Multi-turn conversation context management
- Common Cartridge XML generation library
- Gap analysis algorithms for content recommendations
- Contribution workflow integration

**Related Files**
- `/composables/useLLMChat.ts` - Enhanced reasoning stages
- `/composables/useCourseConstructor.ts` - New composable for course building
- `/content/courses/` - Course skeleton storage
- `/lib/common-cartridge-export.ts` - Export utilities
- `/server/api/courses/` - Course management API

### Related Files
- `/components/AIChatInterface.vue`
- `/components/ChatbotSettings.vue`
- `/composables/useSchemaEnhancedSearch.ts`
- `/composables/useLLMChat.ts`
- `/server/api/chat.post.ts`

---

## 3. OER Course Book Publishing System

**Status:** Planned  
**Priority:** High  
**CMS Roadmap:** Phase 7

### Description
Publish OER materials as cohesive books (course books, textbooks, guides) by arranging existing content into a hierarchical outline using the CMS Outline Builder, then exporting to multiple formats. The primary and most useful output is a **GitBook / docs-style website** — a standalone, navigable, searchable static site generated from the book outline. PDF and Common Cartridge exports are secondary formats for print and LMS import.

### Core Workflow
1. **Curate** — Browse the content library and select items (lessons, lectures, articles, exercises, projects, tutorials)
2. **Arrange** — Organize selected items into a hierarchical outline (parts → chapters → sections) using a drag-and-drop tree builder in the CMS
3. **Publish** — Export the arranged outline as a docs-style website, PDF, or Common Cartridge package

### Requirements

#### 3.1 Book Content Type
- New `books` collection storing outline as structured frontmatter (references content by slug, not duplicated)
- Outline tree schema: nested `{ title, slug?, type?, description?, children[] }` — items with a slug reference existing content, items without are section headings
- Book metadata: title, description, author, license, cover image, learning objectives

#### 3.2 Outline Builder (CMS Tool)
- Visual drag-and-drop hierarchical tree builder with unlimited nesting
- Content picker panel: search/filter existing content by collection, tags, difficulty; drag into tree or click to append
- Section headings for parts/chapters that don't link to content
- Inline author notes and transition text between sections
- Auto-generated, live-updating Table of Contents preview
- Save/load outlines; commits via CMS git backend

#### 3.3 Export Formats

**GitBook / Docs-Style Website** (primary format)
- Static site generation producing a standalone, deployable book site
- Sidebar navigation matching the outline hierarchy
- Chapter-by-chapter pagination (previous/next links)
- Full-text search within the book
- Responsive design with print-friendly CSS
- Deployable to GitHub Pages, Netlify, or any static host
- Optional: custom domain, branding, and theme configuration

**PDF Export**
- Rendered from the book outline with proper pagination, typography, headers/footers
- Table of contents with page numbers
- Includes all referenced content (prose, images, figures, callouts)
- Generated via Puppeteer/Playwright or a dedicated PDF library

**Common Cartridge (IMS CC)**
- Standard IMS Common Cartridge package for LMS import (Canvas, Blackboard, Moodle, etc.)
- Maps outline hierarchy to CC organization structure
- Includes content items, metadata, and learning objectives

### Technical Considerations
- Book outline stored as structured YAML/JSON in frontmatter (references, not copies)
- Export pipeline: read outline → resolve content references → render per format
- GitBook export could use a dedicated Nuxt layout (`layouts/book.vue`) or a separate mini Nuxt app
- PDF generation runs server-side (H3 route) or as a CLI script
- Common Cartridge XML generated from outline + content metadata
- Integrate with existing versioning system for book releases
- Consider incremental rebuilds for large books (only re-export changed chapters)
- SCORM/LTI compliance for LMS integration (optional)

### Related Files
- New content type: `/content/books/`
- CMS tool: `/pages/cms/outline-builder.vue`
- New components: `/components/OutlineBuilder.vue`, `/components/BookTOC.vue`
- Book layout: `/layouts/book.vue`
- New composable: `/composables/useBookPublishing.ts`
- New pages: `/pages/books/[...slug].vue`
- Export utilities: `/lib/book-export/` (website, PDF, Common Cartridge generators)
- Server API: `/server/api/books/`

### Dependencies
- Existing pathway and specialization systems
- Versioning system (see [VERSIONING_SYSTEM.md](VERSIONING_SYSTEM.md))
- OER Schema implementation (see [OER_SCHEMA_IMPLEMENTATION.md](OER_SCHEMA_IMPLEMENTATION.md))

---

## 4. Documentation System

**Status:** Planned  
**Priority:** TBD

### Description
Create comprehensive documentation for the platform covering feature usage, CMS administration, and developer guides.

### Requirements
- Feature documentation for end users
- CMS usage guides for content creators and administrators
- Developer documentation covering:
  - Architecture and design patterns
  - API reference and integration guides
  - Component library and usage examples
  - Contribution guidelines
  - Setup and deployment procedures

### Technical Considerations
- Documentation structure and organization
- Integration with existing content system or separate docs site
- Version-specific documentation
- Search and navigation
- Code examples and interactive demos
- Automated API documentation generation

### Related Files
- New content type or separate docs directory
- Possible integration with existing `/content/docs/` structure

---

## 5. Advanced Content Filtering

**Status:** Planned  
**Priority:** TBD

### Description
Expand filtering capabilities across all content types to enable better content discovery and organization.

### Requirements
- Additional filter dimensions:
  - Educational level/difficulty
  - Estimated time/duration
  - Prerequisites
  - Tags and categories
  - Author
  - License type
  - Content format (video, text, interactive, etc.)
- Multi-select filters with AND/OR logic
- Filter persistence in URL parameters
- Filter presets and saved searches
- Sort options (date, popularity, difficulty, etc.)

### Technical Considerations
- Update content type schemas with additional metadata fields
- Enhance query composables with filter support
- UI components for filter controls
- Performance optimization for complex queries
- Mobile-responsive filter interface

### Related Files
- Content listing components in `/components/`
- Query composables in `/composables/`
- Content type pages in `/pages/`

---

## 6. Prerequisites System

**Status:** Planned  
**Priority:** TBD

### Description
Implement a comprehensive prerequisites system across all content types, similar to the existing component on lessons for adding related content items.

### Requirements
- Add prerequisite relationships to content types:
  - Exercises can have articles or tutorials as prerequisites
  - Lessons can have other lessons as prerequisites
  - Projects can have exercises, lessons, or articles as prerequisites
  - Lectures can reference prior lectures or readings
- UI component for adding prerequisite relationships in CMS
- Display prerequisite information on content pages
- Validation to prevent circular dependencies
- Optional: Progress tracking against prerequisites
- Optional: Suggested learning paths based on prerequisites

### Technical Considerations
- Extend content frontmatter to include prerequisite references
- Create reusable component for prerequisite selection in CMS
- Query system to resolve prerequisite content details
- Graph validation for circular dependency detection
- Integration with existing versioning system (version-specific prerequisites)

### Related Files
- Content type schemas in `/content/`
- New component: `/components/PrerequisiteSelector.vue`
- New component: `/components/PrerequisiteDisplay.vue`
- Query composables in `/composables/`
- DecapCMS config updates

---

## 7. Prerequisites Visualization

**Status:** Planned  
**Priority:** TBD

### Description
Create visual representations of prerequisite relationships to help learners understand content dependencies and plan their learning path.

### Requirements
- Interactive graph visualization showing prerequisite relationships
- Multiple view options:
  - Tree/hierarchy view
  - Network/graph view
  - Linear pathway view
- Highlight completed vs. incomplete prerequisites
- Click nodes to navigate to content
- Filter by content type or educational level
- Zoom and pan controls for complex graphs
- Export visualization as image

### Technical Considerations
- Graph visualization library (D3.js, vis.js, or similar)
- Graph data structure from prerequisite relationships
- Performance optimization for large graphs
- Responsive design for mobile and desktop
- Integration with OER Schema graph system (see existing `useOERSchemaGraph.ts`)
- Optional: Canvas or SVG rendering based on graph complexity

### Related Files
- New component: `/components/PrerequisiteGraph.vue`
- New composable: `/composables/usePrerequisiteGraph.ts`
- Leverage existing: `/composables/useOERSchemaGraph.ts`
- New page: `/pages/prerequisites/` or integration into content pages

---

## 8. Learning Tools Suite

**Status:** In Progress  
**Priority:** Medium

### Description
Comprehensive suite of interactive tools to help students organize, explore, and engage with learning materials in structured ways.

### 8.1 Outline Builder

**Status:** Planned  
**Priority:** Medium

**Description**  
Visual tool for organizing learning resources into custom hierarchical structures using indentation.

**Requirements**
- Drag-and-drop interface for organizing content
- Search and select from existing materials (lessons, lectures, exercises, etc.)
- Create hierarchical structures using indentation
- Reorder and nest content at multiple levels
- Add custom notes and sections
- Save and name outlines for later reference
- Share outlines with others
- Export outlines in multiple formats (PDF, Markdown, JSON, Common Cartridge)
- Import existing course structures or pathways
- Version control for outline iterations

**Technical Considerations**
- Tree data structure for hierarchical organization
- Drag-and-drop library (e.g., @dnd-kit/core, vue-draggable-next)
- Local storage and/or database persistence
- Export utilities for various formats
- Integration with existing content queries
- Collaborative editing considerations (optional)

**Related Files**
- `/pages/tools/outline-builder.vue` (created)
- New component: `/components/OutlineBuilder.vue`
- New composable: `/composables/useOutlineBuilder.ts`
- Server API: `/server/api/outlines/`

### 8.2 Interactive Guides

**Status:** Planned  
**Priority:** Medium

**Description**  
Structured, interactive guides that help students engage with learning materials through specific pedagogical approaches.

**Planned Guides**

*Concept Development Guide*
- Step-by-step exploration of key concepts
- Progressive complexity building
- Interactive exercises and checks for understanding
- Links to relevant materials for deeper learning
- Visual concept mapping

*Writing Guide*
- Technical and creative writing skill development
- Genre-specific guidance (academic, technical documentation, creative)
- Writing exercises with automated feedback suggestions
- Style and structure templates
- Peer review workflows

*Career Guide*
- Professional development pathways
- Portfolio building guidance
- Interview preparation resources
- Industry-specific skill mapping
- Networking and job search strategies

*Theory & Philosophy Guide*
- Exploration of theoretical frameworks
- Historical context and evolution of ideas
- Critical analysis exercises
- Connections between theory and practice
- Guided reading lists

**Technical Considerations**
- Multi-step workflow system with progress tracking
- Content recommendation engine for guide-specific materials
- User input collection and response generation
- Progress persistence and resume functionality
- Adaptive pathways based on user responses
- Integration with AI chat for personalized guidance
- Analytics for guide effectiveness

**Related Files**
- `/pages/tools/guides/index.vue` (created)
- `/pages/tools/guides/concept-development.vue`
- `/pages/tools/guides/writing.vue`
- `/pages/tools/guides/career.vue`
- `/pages/tools/guides/theory-philosophy.vue`
- New component: `/components/GuideWorkflow.vue`
- New composable: `/composables/useGuideProgress.ts`
- Server API: `/server/api/guides/`

### Implementation Progress

**Completed**
- ✅ Created Tools section in navigation
- ✅ Created placeholder pages for Outline Builder and Guides
- ✅ Defined initial guide structure (concept dev, writing, career, theory/philosophy)

**Planned**
- ⏳ Implement Outline Builder drag-and-drop interface
- ⏳ Design guide workflow system
- ⏳ Develop first interactive guide (TBD based on priority)
- ⏳ Integration with AI chat for enhanced interactivity

---

## 9. TBD

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

*Last Updated: February 27, 2026*
