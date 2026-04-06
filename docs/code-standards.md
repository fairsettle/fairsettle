# FairSettle Code Standards

This repo follows a feature-first structure with shared primitives for UI, API contracts, and domain rules.

## Frontend

- Keep `src/app/**/page.tsx` files thin.
- Pages should orchestrate loading, navigation, and composition only.
- Move repeated domain logic into `src/lib/<feature>/`.
- Move shared payload and view-model types into `src/types/`.
- Use shared UI scaffolding where possible:
  - `PageHeader`
  - `AsyncStateCard`
  - shared note/panel styles
- If a component is reused across unrelated features, place it in `src/components/`.
- If a component is specific to one feature, place it in `src/components/<feature>/`.

## Backend

- API route files should focus on transport concerns:
  1. parse input
  2. authorize
  3. validate preconditions
  4. call feature/domain helpers
  5. return typed JSON
- Shared business rules belong in `src/lib/<feature>/`.
- User-facing routes must use the structured localized API error contract from `src/lib/api-errors.ts`.
- Shared request/response payload shapes belong in `src/types/`, not inline in route files or pages.

## Types and Constants

- Database-generated types stay in `src/types/database.ts`.
- App/domain/view-model types should live in focused files such as:
  - `src/types/core.ts`
  - `src/types/dashboard.ts`
  - `src/types/export.ts`
  - `src/types/invitations.ts`
  - `src/types/profile.ts`
  - `src/types/questions.ts`
- Shared enums/unions/constants should live close to the feature that owns them, not in page files.
- Avoid stringly typed status checks when a shared union or helper already exists.

## Async UX

- Prefer one authoritative bootstrap load per page when multiple requests are needed.
- Avoid rendering partial “wrong” states before all required data has loaded.
- Use explicit loading, error, empty, and ready states.
- Do not rely on query params as the source of truth for durable state.

## Content and i18n

- Do not leave English fallback copy in production locale files unless the string is intentionally untranslated.
- Keep translation keys stable where possible.
- Put user-facing error text behind the shared API error translation layer.

## Refactor Rule of Thumb

- If logic is reused twice, consider extraction.
- If a page grows hard to scan, split view helpers and payload types first.
- Prefer small pure helpers over adding memoization by default.
