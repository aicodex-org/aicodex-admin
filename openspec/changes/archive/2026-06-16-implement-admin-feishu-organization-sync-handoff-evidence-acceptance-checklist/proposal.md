## Why

Feishu/Lark organization sync already exposes redacted handoff evidence, but operators still need a compact acceptance checklist to review which evidence is derived locally, which provider-owned facts are missing, and which manual actions remain before downstream handoff.

This change adds a read-only, Admin-owned checklist so handoff evidence can guide manual acceptance without pretending to prove live provider truth, full sync success, Gateway consumption, Insight acceptance, or production readiness.

## What Changes

- Add a redacted acceptance checklist to Feishu/Lark handoff evidence with derived/manual-review-only semantics.
- Classify checklist items by status, severity, source, provider-owned evidence gaps, `cannotInfer`, `noFallback`, redaction/retention, and operator next action aliases.
- Add a read-only API response surface for the checklist through the existing handoff evidence endpoint.
- Extend the Feishu organization sync page with checklist summary, checklist rows, provider-missing/manual-action/cannot-infer sections, and sanitized JSON/Markdown copy/export.
- Cover loading, empty, error, provider-missing, cannot-infer, no-fallback, copy, and export UI states.
- Do not call Feishu/Lark Contact v3, trigger sync, mutate User/Group/Platform data, write Gateway facts, or use raw provider payloads.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `feishu-organization-sync`: Extend Feishu/Lark handoff evidence and export console requirements with a redacted acceptance checklist.

## Impact

- Backend: `admin/object/feishu_organization_sync_handoff_evidence.go` and focused tests.
- API/controller: existing `GET /api/feishu-org-sync/handoff-evidence` response shape and controller tests.
- Frontend: `web-admin/src/FeishuOrganizationSyncPage.js`, backend wrapper tests, and page tests.
- OpenSpec: delta for `feishu-organization-sync`.
- No database schema change, no external Feishu/Lark API call, no Gateway/Insight/API repository changes.
