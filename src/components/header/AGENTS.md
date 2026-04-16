# AGENTS - src/components/header

## Folder purpose

Provides global navigation for desktop/mobile and account access. Integrates session state into the header.

## Rules for agents

- Preserve responsive behavior (desktop vs mobile).
- Don't break logout flow and redirect to /login.
- Links must remain aligned with existing app routes.
- When modifying menu items, review admin role conditions.

## Architecture patterns

- Header component composes main navigation menu, profile dropdown, and mobile menu.
- Logout flow should maintain consistent redirect behavior across all navigation surfaces.
- Menu items should be conditional based on authentication and user role.
