## 1. OpenSpec and Baseline

- [x] 1.1 Create this OpenSpec change with proposal, design, tasks and shell spec delta.
- [x] 1.2 Confirm branch/worktree is based on latest `origin/hfl-test-base`, and record `origin/test` read-only status.

## 2. Overview P0 Polish

- [x] 2.1 Add or update focused tests proving the overview no longer renders a large "capability entrance" directory.
- [x] 2.2 Compress overview capability/risk presentation so first screen prioritizes identity coverage, application access, sync/audit health and next action.
- [x] 2.3 Keep existing route links for identity assets, access preflight, governance tasks and organization quality reachable as contextual actions.

## 3. Application Access P0 Polish

- [x] 3.1 Add or update focused tests for table-first application access summary, compact logo rendering and action grouping.
- [x] 3.2 Reduce `/applications` top summary height and keep the table body visible earlier on desktop.
- [x] 3.3 Reduce horizontal and row-operation visual load by shrinking logos, keeping a stable row key, preserving edit/object-context actions and moving copy/delete to lower-prominence secondary actions.

## 4. Access Preflight P0 Polish

- [x] 4.1 Add or update focused tests proving the access preflight page renders as a compact workflow tool, not a standalone center.
- [x] 4.2 Compact domain selection, gaps, evidence and safety boundary layout while preserving step transitions, result evidence links and no-write safety.
- [x] 4.3 Keep `/access-wizard` route compatibility and no real execution calls.

## 5. Organization Directory / Tree Operations P0 Polish

- [x] 5.1 Add or update focused tests proving engineering lineage fields are not default summary/table primary columns.
- [x] 5.2 Reframe organization directory quality and tree operations primary view around health, sync source, abnormal nodes and recent sync result.
- [x] 5.3 Move read model, org/scope version, batch and lineage identifiers to technical/diagnostic detail areas while keeping copyable evidence.

## 6. i18n, Validation and Report

- [x] 6.1 Update zh/en locale entries for changed visible copy and avoid new hardcoded product copy where practical.
- [x] 6.2 Run OpenSpec validation, diff checks, incremental TypeScript gate, typecheck, focused Jest/coverage and build.
- [x] 6.3 Run browser validation or record exact blocker and minimal follow-up.
- [x] 6.4 Write `verification.md`, final report under `agent-reports`, commit one logical change and send short sanitized report to the master thread.

## 7. Visual Baseline P0 Findings

- [x] 7.1 Rework `/records` primary table from raw request/response/object fields to governance semantics and move raw details to folded, redacted detail evidence.
- [x] 7.2 Add focused tests for audit record presentation and redaction of sensitive JSON/query details.
- [x] 7.3 Add responsive containment classes and CSS for `/wecom-org-sync` and `/feishu-org-sync` so mobile form rows, action bars and table wrappers do not create document-level horizontal overflow.
- [x] 7.4 Browser-check `/wecom-org-sync` and `/feishu-org-sync` mobile `scrollWidth <= clientWidth + 1`.
