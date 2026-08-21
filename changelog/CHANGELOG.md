# Photography Portfolio Project Changelog & Learning Log

This log tracks all architectural, specification, and prompt changes made throughout the development of the photography portfolio project, along with mistakes identified and lessons learned.

---

## [0.4.0] - 2026-08-04

### Added / Completed
- **Project Scaffolding:** Completed the full Astro 4.0 build (Phases 1-6), scaffolding all layouts, content collections, components (including React Lightbox), and utility scripts. 
- **Bug Fix (PATH):** Created local `npm.cmd` and `npx.cmd` wrappers in the root directory to fix execution issues where `npm` wasn't globally accessible by PowerShell without a terminal restart. Also updated the global Windows `$env:Path` for Node.js.

### Lessons Learned & Mistakes Avoided
- **Sitemap Integration Build Failures:** Astro's sitemap integration (`@astrojs/sitemap`) failed during the static build generation phase due to mismatched config expectations on Windows. *Lesson:* In early scaffolding phases, keep build dependencies lean. Removed the sitemap integration temporarily to guarantee a successful static build for visual review. 
- **Toolchain Environment Persistence:** A successful software installation (like Node.js via background task) doesn't inject its `bin` paths into an *already running* terminal session. *Lesson:* Always verify terminal environment variables or restart the session immediately after installing global CLIs.

---

## [0.3.0] - 2026-08-04

### Added / Harmonized
- Fully blended all original initial prompt directives (hardware context, exclusions, image workflow details, security model, Git rules, complete 18-file documentation checklist, and 7 Approval Gates) with the new ultra-modern design tokens and component architecture specifications in [initial_prompt.md](file:///v:/Personal%20Projects/app/prompts/initial_prompt.md).
- Ensured zero instruction duplication while preserving 100% of the initial prompt scope and strict Gate 1 stopping criteria.

### Lessons Learned & Mistakes Avoided
- **Loss of Directive Context during Refactoring:** Replacing prompt text can inadvertently drop critical original directives (such as equipment notes, security rules, or multi-stage approval gates). *Lesson:* Always perform a complete section-by-section diff check against original source files when enhancing master AI prompts to ensure complete specification retention.

---

## [0.2.0] - 2026-08-04

### Added
- Created `changelog/CHANGELOG.md` to track prompt updates, structural changes, and key design decisions.
- Significantly expanded `prompts/initial_prompt.md` into an exhaustive, production-grade **One-Shot Master Prompt for AI Web Building**.
- Defined comprehensive visual design tokens (editorial dark theme, typography scales, glassmorphic accents, fluid grids).
- Defined precise file tree architecture, Astro Content Collection schemas, component hierarchies, responsive image ingestion specs, accessibility standards (WCAG 2.2 AA), performance budgets, and testing rules.

### Changed
- Refocused initial Version One project scope from commercial monetization (licensing, fine-art print catalog, paid service booking) to a **pure photography portfolio showcase**.
- Simplified contact architecture to direct contact form and mailto links.
- Deferred e-commerce, shopping cart, and complex business logic to Phase 2.

### Lessons Learned & Mistakes Avoided
- **Scope Creep in V1:** Designing monetization and complex e-commerce rules in initial prompt delayed building the core visual portfolio. *Lesson:* Establish a rock-solid, ultra-high aesthetic photography portfolio presentation first before layering business logic.
- **Underspecified Design Tokens:** Vague requests for "modern design" lead to generic UI outputs. *Lesson:* Provide explicit font stacks, color palettes (zinc/neutral dark modes with editorial warmth), aspect ratio rules, and fluid typography tokens directly in the initial AI prompt.
- **Silent Asset Overwrites:** Original image assets must never be modified or overwritten in ingestion. *Lesson:* Enforce strict, read-only input ingestion rules that output variants to a isolated build cache/dir with manifest validation.

---

## [0.1.0] - 2026-08-04

### Added
- Initial creation and cleanup of `prompts/initial_prompt.md`.
- Formatted prompt into clean GitHub-flavored Markdown.
