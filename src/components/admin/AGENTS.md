# AGENTS - src/components/admin

## Folder purpose

Admin screen for creating, editing, and removing opportunities. Works with form modes and record listing.

## Rules for agents

- Maintain compatibility with types and data from admin hooks.
- Don't remove fields without validating backend impact.
- Preserve color theming by context (blue for international, amber for national).
- Forms in this folder must remain compatible with react-hook-form.

## Architecture patterns

- Admin panel uses tab-based navigation to separate international and national opportunities.
- Forms handle both create and edit modes with consistent validation.
- Record listing provides inline actions for edit and delete operations.
- Color context distinguishes between international (blue) and national (amber) opportunity types.
