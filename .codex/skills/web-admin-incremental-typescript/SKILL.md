---
name: web-admin-incremental-typescript
description: Project-custom aicodex-admin TypeScript migration guidance. Use when adding, migrating, or reviewing web-admin TS/TSX files, JS/TS coexistence, interface models, type definitions, typecheck validation, or incremental TypeScript migration discipline.
---

# Web Admin Incremental TypeScript

## Source

This is a project-custom skill for `aicodex-admin`, based on `openspec/changes/enable-incremental-typescript-for-web-admin/` and the same change in the Admin route workspace `D:\CodeRepo\LeagProject\aicodex-2\aicodex-admin`. It is not a public TypeScript skill and should stay narrower than broad TypeScript handbooks.

## Default Decision

- For new Admin enterprise identity frontend tasks, start on this TS + React migration route by default.
- Keep pure copy/i18n-only changes, test-only changes, and very small legacy-JS fixes in the existing file type when migrating would add more risk than value.
- When a task touches old JS and the migration risk is unclear, keep the behavior-compatible JS edit and record why TS migration was deferred.

## Migration Rules

- Keep `.js`, `.ts`, and `.tsx` coexistence. Do not start a whole-app migration, broad rename, or formatting sweep inside a feature task.
- Add new React components as `.tsx` by default. If a new component remains `.js`, document the reason in the change or review notes.
- Add shared logic, API/interface models, request/response shapes, and type definitions as `.ts` by default.
- Migrate existing JS only when the current requirement touches that file and the migration is low risk. Preserve routes, permissions, exports, backend contracts, and visible behavior.
- Avoid unexplained `any`. Prefer `unknown` with type narrowing, explicit interfaces, discriminated unions, or clear local type aliases.
- Do not mix React performance refactors, visual redesign, package upgrades, or TS infrastructure changes into a pure TypeScript migration unless typing requires a small local adjustment.

## Validation

- Run `bun run typecheck` for every change that adds or modifies `.ts` or `.tsx`.
- Run focused Jest tests for touched behavior; include coverage only when the change alters logic with meaningful branch risk.
- Run `bun run build` when routing, imports, component boundaries, package usage, or build-time behavior may be affected.
- Use browser or Playwright verification when UI layout, navigation, language mode, permissions, or user workflows change.
- For docs/skill-only changes, use skill validation and `git diff --check`; do not run frontend build unless source code changed.

## Boundaries

- Do not edit `web-admin/package.json`, lockfiles, `tsconfig.json`, or TS build infrastructure unless the task explicitly asks for TypeScript infrastructure work.
- Do not touch `test`, production-like configuration, secrets, authentication, authorization, OAuth/OIDC, Provider contracts, or Gateway projection behavior as incidental migration work.
