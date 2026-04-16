# AGENTS - src/components

## Folder purpose

This folder concentrates React components organized by functional domain. Each subfolder maintains its own responsibility by domain (auth, admin, opportunities, profile, world-map, ui).

## Rules for agents

- Don't mix domain logic across subfolders unnecessarily.
- Prefer reusing components from src/components/ui before creating new markup.
- Maintain prop contracts and types used by page components.
- Always preserve existing visual classes when migrating to shadcn.

## Architecture patterns

- Component organization follows domain responsibility: each subfolder has clear ownership.
- Reusable UI components live in the `ui` folder to avoid duplication.
- Domain-specific components handle their own state and data integration.
- Share types and contracts through local `types.ts` files within each domain.
