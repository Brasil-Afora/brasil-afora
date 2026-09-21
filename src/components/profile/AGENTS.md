# AGENTS - src/components/profile

## Folder purpose

The signed-in profile (`/perfil`): the opportunities the student saved in their account, and the applications they're tracking in this browser.

## Files

- `profile-main.tsx`: container. Account favorites (TanStack Query), removing a favorite (with confirmation).
- `profile-dashboard.tsx`: page body. Builds the view, handles status changes (approval confetti), "Começar", "Parar de acompanhar" (with confirmation).
- `profile-model.ts`: pure data. Joins favorites, tracking and the opportunity records (verified set + catalog lists) by id; decides what is "started", upcoming deadlines, and similar opportunities.
- `profile-header.tsx`, `profile-applications.tsx`, `profile-saved.tsx`, `profile-sidebar.tsx`: the sections.

## Rules for agents

- Tracking lives in localStorage under keys that predate the redesign and hold students' data: `oportunidadesStatus`, `oportunidadesPinned`, `oportunidadesChecklist` (shapes in `profile-model.ts`), plus the step ticks `brasil-afora:etapas:<scope>:<id>` shared with the opportunity page. Never rename them or change their shapes.
- Read and write them through `useApplicationTracker` / `useApplicationSteps`, which keep every component (and other tabs) in sync and render the empty state on the server.
- An opportunity is "em andamento" when it has a status, a task, or a ticked step, saved or not. Nothing is inferred from dates.
- Keep confirmations before removing a favorite or forgetting an application; removing a single task offers "Desfazer" instead.
- Show only what the account and the data hold. There are no academic-profile fields, alerts or saved searches, so don't render placeholders for them.
