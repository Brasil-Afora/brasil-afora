# AGENTS - src/components/auth

## Folder purpose

Implements authentication flows and related screens. Primary integration with src/lib/auth-client.ts.

## Rules for agents

- Maintain coherent redirects with Next.js App Router routes.
- Forms should use react-hook-form when applicable.
- Don't duplicate auth calls; reuse functions from auth-client.
- Preserve error/success messages in Portuguese.

## Architecture patterns

- Authentication flows use centralized auth-client utilities to avoid duplication.
- Forms follow a consistent pattern with react-hook-form for validation and submission.
- Route protections are enforced at the App Router level via server/session guards.
- All error handling and user feedback is localized for consistency.
