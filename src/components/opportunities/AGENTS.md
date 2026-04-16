# AGENTS - src/components/opportunities

## Folder purpose

Shared components for listing and filtering used by national/international flows.

## Rules for agents

- Don't hard-code colors outside of `accentColor` parameter when parameterization is supported.
- Shared types must remain the source of truth for this folder.
- Layout should follow current responsiveness (mobile sidebar + desktop panel).
- Reuse FilterDropdown instead of creating new custom dropdowns.

## Architecture patterns

- Common layout component provides shared structure for filter area and results display.
- Opportunity cards are designed as reusable, style-agnostic components.
- Filter component accepts accent color as parameter to support multiple themes.
- Shared types define the contracts between domain-specific and shared components.
- Responsive layout adapts from sidebar on mobile to side panel on desktop.
