## ADDED Requirements

### Requirement: Admin 必须提供 cleanup approval decision draft readiness

Admin SHALL provide an admin-only read-only cleanup approval decision draft readiness for gateway projection publish attempt retention cleanup so operators can review a copy-safe approval decision draft before any future destructive cleanup execution gate exists.

#### Scenario: Operator requests approval decision draft readiness
- **WHEN** an authorized Admin operator requests cleanup approval decision draft readiness for an organization
- **THEN** Admin SHALL require `organization`
- **AND** Admin SHALL evaluate the draft from Admin-owned cleanup approval policy readiness, cleanup execute readiness and approval audit trail only
- **AND** Admin SHALL support safe filters such as `source`, `status`, `failureCategory`, `olderThan`, `readinessHash`, `dryRunGeneratedAt`, `maxDryRunAgeSeconds`, `approvalEvidence` and `limit`
- **AND** Admin SHALL NOT query API, Gateway or Insight internal storage

#### Scenario: Decision draft readiness envelope is returned
- **WHEN** Admin returns cleanup approval decision draft readiness
- **THEN** the response SHALL include `decisionDraftId`, `decisionDraftHash`, `decisionReadiness`, `decisionState`, `decisionSummary`, `executionMode`, `cleanupExecutionAllowed`, `policyVersion`, `policyStatus`, `readinessHash`, `dryRunId`, `manualReviewChecklist`, `cannotInfer`, `blockingReasons`, `copySafeLabels`, `retentionSummary`, `auditSummary`, `redactionSummary`, `operatorNextAction`, `executeGuardrail`, generated time and a sanitized export payload
- **AND** `executionMode` SHALL be `manual_review_only`
- **AND** `cleanupExecutionAllowed` SHALL be `false`
- **AND** the response SHALL NOT include token, Cookie, private URL, raw Gateway response, complete organization tree, complete subject details or resource authorization facts

#### Scenario: Decision draft fails closed when evidence cannot be inferred
- **WHEN** approval policy readiness is blocked, cannot infer, missing manual review actions, has a reject action, or has a readiness hash mismatch
- **THEN** Admin SHALL return `decisionReadiness=blocked`, `decisionReadiness=manual_review_required` or `decisionReadiness=cannot_infer`
- **AND** Admin SHALL include stable `cannotInfer.reasonAliases` and `blockingReasons`
- **AND** Admin SHALL return a conservative `operatorNextAction`
- **AND** Admin SHALL keep `cleanupExecutionAllowed=false`
- **AND** Admin SHALL still represent `executeGuardrail.enabled=false` as a P0 execution boundary even when the decision draft itself is ready for manual review

#### Scenario: Decision draft remains read-only
- **WHEN** operator requests, refreshes, copies or exports cleanup approval decision draft readiness
- **THEN** Admin SHALL NOT delete or update publish attempt records
- **AND** Admin SHALL NOT trigger projection publish
- **AND** Admin SHALL NOT write Gateway authorization facts
- **AND** Admin SHALL NOT create a real cleanup approval decision or open a production cleanup gate

### Requirement: Web admin 必须展示 cleanup approval decision draft readiness

Admin web UI SHALL expose cleanup approval decision draft readiness near the gateway projection publish attempt cleanup approval policy readiness and approval audit trail.

#### Scenario: Operator reviews approval decision draft in web admin
- **WHEN** an Admin operator opens the gateway projection publish attempt cleanup readiness area
- **THEN** the UI SHALL display decision readiness, decision state, policy status, manual review checklist, cannotInfer reason aliases, blocking reasons, copy-safe labels, retention/audit/redaction summaries and operator next action
- **AND** the UI SHALL support copying or exporting sanitized decision draft JSON
- **AND** the UI SHALL cover loading, empty, error and disabled states without exposing destructive cleanup controls
- **AND** the UI SHALL explain that decision draft readiness is Admin producer diagnostics and manual review guidance only, not a real approval decision, downstream authorization evidence or cleanup execution approval
