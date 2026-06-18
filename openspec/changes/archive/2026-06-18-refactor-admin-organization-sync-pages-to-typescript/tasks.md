## 1. Baseline And Shared TSX Shell

- [x] 1.1 Confirm `hfl-test-base` is clean and run `web-admin` incremental TypeScript gate before implementation.
- [x] 1.2 Inventory current WeCom and Feishu sync page props, state fields, API payloads, run record shapes, and test coverage.
- [x] 1.3 Add shared `web-admin/src/organizationSync/` TS/TSX types and helpers for provider display, run status, impact counts, timestamps, and safe summary rendering.
- [x] 1.4 Add `OrganizationSyncPageHeader.tsx` using compact provider logo, title, and subtitle/status text with accessible alt text.
- [x] 1.5 Add shared action bar/status components for save, test connection, dry-run preview, history, full sync, refresh, and running-disabled states without coupling provider APIs.
- [x] 1.6 Add focused tests for shared TS/TSX helpers and shell components.

## 2. WeCom Page Migration

- [x] 2.1 Migrate `WecomOrganizationSyncPage.js` to TSX or a TSX wrapper-backed page while preserving route export and existing backend calls.
- [x] 2.2 Replace local title/action/status/run table presentation with shared shell components where the behavior is identical.
- [x] 2.3 Add WeCom provider logo to the page header using existing provider logo infrastructure.
- [x] 2.4 Preserve target organization selection, Corp ID, masked secret, enablement, soft-disable, schedule settings, connection test, manual sync, duplicate running sync handling, polling, pagination, and sync records.
- [x] 2.5 Migrate or adjust WeCom page tests to `.test.tsx` when the touched component becomes TSX, preserving current assertions and adding coverage for provider logo/header consistency.

## 3. Feishu Page Migration

- [x] 3.1 Extract Feishu-safe shared type definitions or local helper types for config, run, diagnostics, dry-run, binding diagnostics, and handoff evidence payloads.
- [x] 3.2 Migrate Feishu page in conservative slices to TSX or TSX-backed components without rewriting polling, modals, drawers, copy/export helpers, or backend calls.
- [x] 3.3 Replace base title/action/status/run table presentation with shared shell components where behavior matches WeCom.
- [x] 3.4 Add Feishu/Lark provider logo to the page header using existing provider logo infrastructure and keep endpoint mode context compact.
- [x] 3.5 Preserve dry-run preview, dry-run history modal/detail, binding diagnostics, handoff evidence, acceptance checklist, redaction boundaries, running-state handling, and compact diagnostics behavior.
- [x] 3.6 Migrate or adjust Feishu page tests to `.test.tsx` when the touched component becomes TSX, preserving current redaction/export/compact-state assertions and adding coverage for provider logo/header consistency.

Note: `FeishuOrganizationSyncPage.js` and `FeishuOrganizationSyncPage.test.js` intentionally remain JavaScript in this change because the page still contains a large dry-run/history/binding/handoff surface; the low-risk slice adds typed helpers and shared TSX shell usage without a full page rewrite.

## 4. Visual Consistency And Regression Checks

- [x] 4.1 Compare `/wecom-org-sync` and `/feishu-org-sync` layouts for common header, target organization, credential fields, sync options, schedule, primary action order, running-state buttons, and formal sync records.
- [x] 4.2 Verify Feishu-only dry-run, binding diagnostics, and handoff evidence remain compact by default and do not make WeCom page heavier.
- [x] 4.3 Verify long IDs, aliases, safe summaries, and table content wrap or truncate without horizontal layout regressions beyond existing table constraints.
- [x] 4.4 Verify no raw secrets, tenant identifiers, user identifiers, phone, email, raw provider payload, token, Cookie, or private URL is added to UI or tests.

## 5. Validation And Delivery

- [x] 5.1 Run `openspec validate refactor-admin-organization-sync-pages-to-typescript --strict`.
- [x] 5.2 Run `openspec validate --changes --strict`.
- [x] 5.3 Run `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base` in `web-admin`.
- [x] 5.4 Run `yarn typecheck` in `web-admin`.
- [x] 5.5 Run focused Jest tests for shared organization sync components, `WecomOrganizationSyncPage`, `FeishuOrganizationSyncPage`, and affected backend wrapper tests if typings touch wrapper calls.
- [x] 5.6 Run `yarn build` in `web-admin`.
- [x] 5.7 Run browser or Playwright verification for `/wecom-org-sync` and `/feishu-org-sync` desktop layouts, including logo rendering and compact diagnostic states.
- [x] 5.8 Run `git diff --check`, review final diff for unrelated changes, and document any retained JS files or deferred Feishu migration slices.
