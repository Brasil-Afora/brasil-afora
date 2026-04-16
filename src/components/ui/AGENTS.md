# AGENTS - src/components/ui

## Folder purpose

Library of reusable UI components based on shadcn/base-ui. This folder should not contain business logic.

## Rules for agents

- Avoid importing business logic hooks here.
- Use semantic tokens and classes already adopted in the project.
- Preserve public API of each component (props/export).
- Before creating a new component, validate if an equivalent already exists.

## Architecture patterns

- UI components are purely presentational and accept data via props.
- Modal and dialog patterns use AlertDialog as the foundation.
- Form components (input, textarea, field, label) provide a consistent foundation for forms across the app.
- Notification system uses Sonner for toast notifications.
- All components follow accessibility guidelines with proper semantic HTML.
