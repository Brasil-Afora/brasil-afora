# AGENTS - src/components/international-opportunities

## Folder purpose

Complete flow for international opportunities: listing, filtering, details, and favorites.

## Rules for agents

- International accent theme must remain blue.
- Maintain favorites integration without breaking required login.
- Preserve behavior of internal tabs in detail views.
- Avoid duplicating logic with national-opportunities when possible.

## Architecture patterns

- International opportunities flow mirrors the national flow but with distinct styling (blue accent).
- Filtering uses centralized filter components with combobox dropdowns.
- Detail view displays comprehensive information and provides favorite toggle actions.
- Confirmation popups ensure user intent for destructive actions like removing favorites.
