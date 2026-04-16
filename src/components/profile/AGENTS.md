# AGENTS - src/components/profile

## Folder purpose

User profile flow and favorites, including checklist workflow for each opportunity.

## Rules for agents

- Don't break local persistence (status/checklist/pin).
- Preserve confirmations before destructive actions.
- Maintain compatibility with opportunity detail links.
- Any state changes must respect opportunity IDs as the key.

## Architecture patterns

- Profile page uses tab-based navigation to organize user content.
- Favorite opportunities display with status indicators and checklist functionality.
- Confirmation popups safeguard against accidental removal of favorites.
- Local storage persistence maintains user's checklist and pin status across sessions.
