# AGENTS - src/hooks

## Folder purpose

Reusable hooks for data fetching, local state, animations, and UI utilities.

## Hook categories

- **Data**: Domain hooks for fetching opportunities and admin data, typically wrapping TanStack Query
- **Persistent state**: Hooks for local and session storage
- **UI/Interaction**: Hooks for outside click detection, scroll observation, scroll reveal effects, and staggered animations
- **Domain logic**: Hooks for favorite toggling, opportunity filtering, and toast notifications

## Rules for agents

- Keep hooks pure without hidden side effects.
- Always review dependency arrays in useEffect/useCallback.
- Don't access DOM directly when a utility hook already exists.
- Hook return contracts should not change without updating all consumers.

## Architecture patterns

- Hooks abstract data fetching and caching through TanStack Query.
- UI hooks provide reusable interaction patterns without business logic.
- Domain hooks encapsulate business operations (favorites, filtering, notifications).
- All hooks follow React best practices with proper dependency management.
