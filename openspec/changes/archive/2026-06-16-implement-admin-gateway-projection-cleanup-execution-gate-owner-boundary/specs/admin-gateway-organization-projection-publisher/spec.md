## ADDED Requirements

### Requirement: Admin 必须提供 cleanup execution gate owner-boundary preflight

Admin SHALL provide an admin-only read-only cleanup execution gate owner-boundary preflight for gateway projection publish attempt retention cleanup so operators can review owner scope, manual review blockers, no-fallback guarantees and redacted evidence before any future destructive cleanup execution gate exists.

#### Scenario: Operator requests execution gate owner-boundary preflight
- **WHEN** an authorized Admin operator requests cleanup execution gate owner-boundary preflight for an organization
- **THEN** Admin SHALL require `organization`
- **AND** Admin SHALL evaluate the preflight from Admin-owned cleanup approval decision draft, approval policy readiness, cleanup execute readiness and approval audit trail only
- **AND** Admin SHALL support safe filters such as `source`, `status`, `failureCategory`, `olderThan`, `readinessHash`, `dryRunGeneratedAt`, `maxDryRunAgeSeconds`, `approvalEvidence` and `limit`
- **AND** Admin SHALL NOT query API, Gateway or Insight internal storage

#### Scenario: Execution gate preflight envelope is returned
- **WHEN** Admin returns cleanup execution gate owner-boundary preflight
- **THEN** the response SHALL include `gatePreflightId`, `gatePreflightHash`, `gateReadiness`, `gateState`, `gateSummary`, `executionMode`, `cleanupExecutionAllowed`, `ownerBoundary`, `manualReviewBlockers`, `cannotInfer`, `noFallback`, `retentionSummary`, `redactionSummary`, `operatorNextAction`, `executeGuardrail`, `copySafeLabels`, generated time and a sanitized export payload
- **AND** `executionMode` SHALL be `manual_review_only`
- **AND** `cleanupExecutionAllowed` SHALL be `false`
- **AND** `ownerBoundary.adminAuthorityOnly` SHALL be `true`
- **AND** `noFallback.enforced` SHALL be `true`
- **AND** the response SHALL NOT include token, Cookie, private URL, raw Gateway response, complete organization tree, complete subject details or resource authorization facts

#### Scenario: Execution gate preflight fails closed when evidence cannot be inferred
- **WHEN** decision draft readiness is blocked, cannot infer, missing manual review actions, has a reject action, has a readiness hash mismatch, or lacks required owner-boundary evidence
- **THEN** Admin SHALL return `gateReadiness=blocked`, `gateReadiness=manual_review_required` or `gateReadiness=cannot_infer`
- **AND** Admin SHALL include stable `cannotInfer.reasonAliases`, `manualReviewBlockers` and `noFallback.reasonAliases`
- **AND** Admin SHALL return a conservative `operatorNextAction`
- **AND** Admin SHALL keep `cleanupExecutionAllowed=false`
- **AND** Admin SHALL still represent `executeGuardrail.enabled=false` as the P0 execution boundary even when the preflight itself is ready for owner-boundary review

#### Scenario: Execution gate preflight remains read-only
- **WHEN** operator requests, refreshes, copies or exports cleanup execution gate owner-boundary preflight
- **THEN** Admin SHALL NOT delete or update publish attempt records
- **AND** Admin SHALL NOT trigger projection publish or remediation actions
- **AND** Admin SHALL NOT write Gateway authorization facts
- **AND** Admin SHALL NOT create a real cleanup execution approval or open a production cleanup gate

### Requirement: Web admin 必须展示 cleanup execution gate owner-boundary preflight

Admin web UI SHALL expose cleanup execution gate owner-boundary preflight near the gateway projection publish attempt cleanup approval decision draft and audit trail.

#### Scenario: Operator reviews execution gate preflight in web admin
- **WHEN** an Admin operator opens the gateway projection publish attempt cleanup readiness area
- **THEN** the UI SHALL display gate readiness, gate state, owner boundary, manual review blockers, cannotInfer reason aliases, noFallback status, retention/redaction summaries, copy-safe labels and operator next action
- **AND** the UI SHALL support copying or exporting sanitized preflight JSON
- **AND** the UI SHALL cover loading, empty, error, blocked, ready and cannotInfer states without exposing destructive cleanup controls
- **AND** the UI SHALL explain that execution gate preflight is Admin producer diagnostics and owner-boundary manual review guidance only, not a real cleanup execution approval, downstream authorization evidence or runtime authorization success
