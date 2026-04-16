# AGENTS - src/components/world-map

## Folder purpose

Visualization of opportunities on a map with a side panel for countries/opportunities.

## Rules for agents

- Preserve click interaction on countries and synchronization with side panel.
- Avoid performance regression in map rendering.
- Don't remove country code mappings without reviewing impact on highlighting.
- Visual changes must maintain readability on the current dark background.

## Architecture patterns

- Map component displays geographic data with interactive country selection.
- Side panel synchronizes with map interactions, showing relevant opportunity details.
- Country code mappings maintain relationships between geographic data and opportunity metadata.
- Performance is maintained through efficient rendering and minimal re-renders on interaction.
