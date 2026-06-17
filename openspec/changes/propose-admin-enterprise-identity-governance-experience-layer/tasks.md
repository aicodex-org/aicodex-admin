## 1. P0 Shared Models and Guardrails

- [x] 1.1 Add TypeScript models for source scope labels, cannotInfer states, evidence entries, impact object references, sensitive redaction summaries and safe next actions.
- [x] 1.2 Add shared utilities that label current-view/current-filter/read-only-derived data and prevent those summaries from being rendered as global facts.
- [x] 1.3 Add focused `.test.ts` coverage for source labeling, redaction, cannotInfer handling and no-global-fact wording.
- [x] 1.4 Verify P0 shared models with `yarn typecheck` and focused tests before wiring them into UI components.

## 2. P0 Asset Relationship Layer

- [ ] 2.1 Implement `.tsx` object detail drawer or light detail page components for high-value identity assets, starting with Application, Provider binding, User/Role/Permission and Gateway mapping objects.
- [ ] 2.2 Add current-view relationship lists for organization, user, role, permission, application, auth source, LLM AI/Gateway and audit evidence references.
- [ ] 2.3 Add timeline and evidence entry links that route to existing audit, sync, token, verification, Gateway mapping or readiness pages without triggering execution behavior.
- [ ] 2.4 Add focused `.test.tsx` coverage for object boundaries, relationship source labels, empty state, error state, permission state, route actions and sensitive redaction.
- [ ] 2.5 Run `yarn typecheck`, focused tests, `yarn build` as risk requires, and browser verification that object entry points work while core lists remain accessible.

### 2a. Completed P0 Asset Relationship Slice: `/applications` + `/providers`

- [x] 2a.1 Implement Application and Provider object context drawer entry points from existing list row actions.
- [x] 2a.2 Add current-view/current-filter relationship lists for Provider binding, target organization, callback, authorization scope, auth source, sync diagnostics, application binding lookup and configuration completeness.
- [x] 2a.3 Add timeline/evidence links to existing audit, token, verification, Gateway mapping, application list and diagnostics routes without triggering execution behavior.
- [x] 2a.4 Add focused `.test.tsx` coverage for Application/Provider object boundaries, relationship source labels, cannotInfer state, permission state, route actions, sensitive redaction and zh/en copy.
- [x] 2a.5 Run `yarn typecheck`, focused tests with coverage, `yarn build`, and browser verification for `/applications` and `/providers` before reporting the slice.

## 3. P0 Governance Task Center

- [x] 3.1 Implement TypeScript task classifiers for sync failures, orphan accounts, privileged roles, incomplete applications, abnormal tokens, missing callbacks, Provider binding risks and Gateway mapping gaps.
- [x] 3.2 Implement a `.tsx` governance task queue page with filters for type, severity, impact object, source scope, processing state and keyword.
- [x] 3.3 Make P0 task sources explicitly current-view/current-filter/read-only candidates and route suggested actions to existing configuration, evidence or detail pages only.
- [x] 3.4 Add focused tests for task type, severity, source scope labels, cannotInfer, suggested actions, empty state, error state and sensitive redaction.
- [ ] 3.5 Run `yarn typecheck`, focused tests, `yarn build` as risk requires, and browser verification for filters, task actions, empty/error/permission states and no global-fact mislabeling.

## 4. P0 Connection Wizards

- [x] 4.1 Implement TypeScript wizard state, step, blocker, preflight result and redacted result summary models for auth source, application access and Gateway/LLM AI mapping flows.
- [x] 4.2 Implement `.tsx` wizard shell, steps, preflight checklist, enable-before-check page and result page without replacing existing Provider/Application/Gateway edit routes.
- [x] 4.3 Limit P0 preflight/test connection to configuration completeness and current-object read-only simulation; do not execute real OAuth/OIDC callback, Provider login, sync, Gateway publish, cleanup or receipt verification.
- [x] 4.4 Add focused tests for step transitions, cancel/return, blockers, result page, permission state, preflight failure, cannotInfer and sensitive redaction.
- [ ] 4.5 Run `yarn typecheck`, focused tests, `yarn build` as risk requires, and browser verification for wizard flow, safe cancellation and no real execution calls.

## 5. P1 Read-only Aggregation Interfaces

- [ ] 5.1 Define read-only relationship aggregation API contracts with scope, generatedAt, sourceOfTruth, redactionSummary and cannotInfer reason fields.
- [ ] 5.2 Define read-only governance task aggregation API contracts with pagination, task type, severity, impact object, source scope, evidence entry and safe next action.
- [ ] 5.3 Define read-only preflight/test summary API contracts for auth source, application access and Gateway/LLM AI mapping flows.
- [ ] 5.4 Add backend and frontend validation for permission filtering, redaction, partial failure and no-write behavior.

## 6. P2 Processing State and History

- [ ] 6.1 Propose separate data owner, audit, retention and permission model for persisted governance task processing state.
- [ ] 6.2 Propose separate history model for connection wizard preflight/test results and redacted exports.
- [ ] 6.3 Define rollback and cleanup rules before any persistent task state, real connection test history or cross-domain result evidence is implemented.
