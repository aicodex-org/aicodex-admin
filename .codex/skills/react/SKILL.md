---
name: react
description: Use when working on the aicodex-admin React web-admin frontend, including React 18 components, CRA/CRACO routing, hooks, state/effects, tests, build checks, and enterprise admin UI changes. Apply for tasks that modify or review web-admin React pages, navigation, request handling, or frontend behavior in this repository.
---

# React Admin Frontend

## Project Shape

- Work in `web-admin`, a React 18 JavaScript app using Create React App through CRACO.
- Use the existing package manager and scripts from `web-admin/package.json`: `yarn`, `craco start`, `craco test`, and `craco build`.
- Keep React Router v5 patterns: routes are centralized in `src/ManagementPage.js`, with route guards through `renderLoginIfNotLoggedIn`.
- Reuse existing project helpers before adding abstractions: `Setting`, `Conf`, `*Backend` modules, shared controls in `src/common`, and existing page/table patterns.
- Do not introduce a new state library, routing framework, data-fetching framework, UI framework, or TypeScript-wide migration unless the task explicitly requires it.

## Implementation Rules

- Prefer the smallest page/component change that fits the current structure; avoid broad refactors across unrelated pages.
- Keep enterprise admin pages operational and scannable. Do not build marketing-style landing pages, oversized hero sections, decorative dashboards, or one-off visual systems.
- For new admin pages, wire all expected entry points together: component import, `<Route>`, `enterpriseNavigation` menu item, selection matcher, permission visibility, and any organization config tree impact.
- For side effects in function components, guard async updates with a cancellation flag or equivalent cleanup when the component can unmount before the request finishes.
- Preserve existing class component patterns when editing class pages; do not convert files to hooks only as incidental cleanup.
- Use `Setting.showMessage` and existing backend response conventions (`res.status === "ok"`, `res.msg`, `res.data`) for request feedback.
- Cover loading, empty, error, unauthorized, submit-in-progress, and duplicate-action states where the workflow can reach them.
- Keep user-visible copy compatible with the admin i18n skill; avoid adding hard-coded mixed Chinese/English text in new UI.

## Validation

- For pure React/UI logic, prefer focused existing tests near the touched page. Do not add broad snapshots or mock-only tests with little behavioral value.
- For low-risk skill or documentation-only changes, validate file format and `git diff --check`; no frontend build is required unless React code changed.
- For React code changes, choose from `yarn test --watchAll=false --runInBand <focused tests>`, `yarn build`, and browser/Playwright verification based on risk.
- Before reporting success, include whether business source, `web-admin/package.json`, lockfiles, OpenSpec changes, `test`, and build config were untouched when that is part of the task boundary.
