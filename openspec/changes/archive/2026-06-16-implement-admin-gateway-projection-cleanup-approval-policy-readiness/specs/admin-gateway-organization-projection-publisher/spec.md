## ADDED Requirements

### Requirement: Admin 必须提供 cleanup approval policy readiness
Admin SHALL provide an admin-only read-only cleanup approval policy readiness for gateway projection publish attempt retention cleanup so operators can review manual approval policy gates before any destructive cleanup execution exists.

#### Scenario: Operator requests approval policy readiness
- **WHEN** an authorized Admin operator requests cleanup approval policy readiness for an organization
- **THEN** Admin SHALL require `organization`
- **AND** Admin SHALL evaluate policy readiness from Admin-owned cleanup execute readiness and approval audit trail only
- **AND** Admin SHALL support safe filters such as `source`, `status`, `failureCategory`, `olderThan`, `dryRunGeneratedAt`, `maxDryRunAgeSeconds`, `approvalEvidence`, `readinessHash` and `limit`
- **AND** Admin SHALL NOT query API, Gateway or Insight internal storage

#### Scenario: Policy readiness envelope is returned
- **WHEN** Admin returns cleanup approval policy readiness
- **THEN** the response SHALL include `policyVersion`, `policyStatus`, `storageScope`, `retentionPolicyVersion`, `approvalAuditStorageScope`, `readinessHash`, `safeNextAction`, `manualReview`, `cannotInfer`, `policyGates`, `auditSummary`, generated time and a sanitized export payload
- **AND** `storageScope` SHALL make clear that P0 policy readiness is a derived non-persisted read model
- **AND** the response SHALL NOT include token, Cookie, private URL, raw Gateway response, complete organization tree, complete subject details or resource authorization facts

#### Scenario: Policy readiness fails closed when evidence cannot be inferred
- **WHEN** cleanup execute readiness is blocked, readiness hash is missing, approval audit trail is empty, audit hash does not match the current dry-run hash, required manual review actions are missing or a reject action exists
- **THEN** Admin SHALL return `policyStatus=blocked`, `policyStatus=manual_review_required` or `policyStatus=cannot_infer`
- **AND** Admin SHALL include stable `cannotInfer.reasonAliases` such as `readiness_hash_missing`, `approval_audit_trail_empty`, `approval_audit_hash_mismatch`, `manual_review_action_missing`, `approval_rejected`, `execute_readiness_blocked` or `cleanup_execution_not_enabled`
- **AND** Admin SHALL return a conservative `safeNextAction`
- **AND** Admin SHALL keep cleanup execution disabled for P0

#### Scenario: Approval policy remains read-only
- **WHEN** operator requests, refreshes, copies or exports cleanup approval policy readiness
- **THEN** Admin SHALL NOT delete or update publish attempt records
- **AND** Admin SHALL NOT trigger projection publish
- **AND** Admin SHALL NOT write Gateway authorization facts
- **AND** Admin SHALL NOT create a real cleanup approval decision or open a production cleanup gate

### Requirement: Web admin 必须展示 cleanup approval policy readiness
Admin web UI SHALL expose cleanup approval policy readiness near the gateway projection publish attempt cleanup approval audit trail.

#### Scenario: Operator reviews approval policy readiness in web admin
- **WHEN** an Admin operator opens the gateway projection publish attempt cleanup readiness area
- **THEN** the UI SHALL display policy status, safe next action, manual review status, cannotInfer reason aliases, policy gates, audit summary, storage scope, policy version and retention policy version
- **AND** the UI SHALL support copying or exporting sanitized policy readiness JSON
- **AND** the UI SHALL cover loading, empty, error and disabled states without exposing destructive cleanup controls
- **AND** the UI SHALL explain that policy readiness is Admin producer diagnostics and manual review guidance only, not downstream authorization evidence or cleanup execution approval
