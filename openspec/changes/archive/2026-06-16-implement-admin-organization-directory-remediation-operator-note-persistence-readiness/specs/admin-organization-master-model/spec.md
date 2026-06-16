## ADDED Requirements

### Requirement: Admin SHALL expose organization directory remediation operator note persistence readiness
Admin SHALL provide a read-only organization directory remediation operator note persistence readiness API that evaluates whether a derived approval packet operator note has the minimum Admin-owned contract evidence needed before any future persistent operator notes store is introduced.

#### Scenario: Operator reads operator note persistence readiness
- **WHEN** an authorized Admin operator requests persistence readiness for an organization and note, packet, preview, draft, action, risk, status, or keyword filter
- **THEN** Admin SHALL evaluate only Admin-owned approval packet operator notes, approval packet audit, approval preview, remediation preflight, and action draft metadata
- **AND** Admin SHALL return `readinessId`, `readinessHash`, `noteHash`, `packetHash`, `approvalPreviewHash`, `executionMode`, `autoExecutionAllowed`, `storageScope`, `persistenceAllowed`, `storeDecisionRequired`, `readinessStatus`, `readyForPersistenceDesignReview`, `idempotencyKey`, `idempotencyComponents`, `permissionChecklist`, `retentionChecklist`, `auditSemanticsChecklist`, `redactionChecklist`, `manualReviewGate`, `cannotInfer`, `blockedReasons`, `safeSummary`, and `exportSummary`
- **AND** every readiness record SHALL set `executionMode=manual_review_only`
- **AND** every readiness record SHALL set `autoExecutionAllowed=false`
- **AND** every readiness record SHALL set `storageScope=readiness_only`, `persistenceAllowed=false`, and `storeDecisionRequired=true`
- **AND** Admin SHALL NOT create or update a persistent notes store, write organization master data, repair relationships, trigger gateway projection publish, write Gateway facts, or query API/Gateway/Insight internal databases

#### Scenario: Operator filters operator note persistence readiness
- **WHEN** the operator provides `readinessId`, `readinessHash`, `noteId`, `noteHash`, `packetAuditId`, `packetHash`, `approvalPreviewHash`, `draftId`, or filters such as `actionAlias`, `reasonCode`, `entityType`, `qualityStatus`, `sourceType`, `sourceConnectionIdHash`, `riskLevel`, `packetStatus`, `keyword`, `limit`, or `topN`
- **THEN** Admin SHALL apply those filters through the operator notes and approval packet audit read models before deriving persistence readiness
- **AND** Admin SHALL return an empty readiness result for empty organization scope rather than scanning across organizations
- **AND** Admin SHALL return an empty readiness result when `qualityStatus=ready` is requested
- **AND** Admin SHALL reject unsupported entity/action/risk/status/limit values with an operator-readable error
- **AND** Admin SHALL return an empty readiness result when a requested readiness, note, packet, or preview identifier does not match any generated operator note

#### Scenario: Operator note persistence readiness fails closed
- **WHEN** the operator is not authorized for the requested organization
- **THEN** Admin SHALL deny the request through the normal organization-scoped authorization path
- **WHEN** Admin-owned operator notes, audit, approval preview, preflight, or action draft generation returns an internal error
- **THEN** Admin SHALL return an error response rather than a successful persistence readiness record
- **WHEN** the matching operator note is blocked, has no samples, lacks manual-review-only metadata, lacks cannotInfer boundaries, or cannot be generated
- **THEN** Admin SHALL set `persistenceAllowed=false`, include stable blocked reasons, and avoid representing readiness as a persistent write approval
- **AND** Admin SHALL NOT include token, Cookie, private URL, source payload, raw organization tree, or credential details in the error response

#### Scenario: Operator note persistence readiness remains sanitized
- **WHEN** Admin returns or exports operator note persistence readiness data
- **THEN** `idempotencyKey`, `idempotencyComponents`, `permissionChecklist`, `retentionChecklist`, `auditSemanticsChecklist`, `redactionChecklist`, `manualReviewGate`, `cannotInfer`, `blockedReasons`, `safeSummary`, and `exportSummary` SHALL expose only stable hashes, display-safe labels, status/reason aliases, risk/checklist/approval summary, manual-review-only status, and source/org version summaries
- **AND** readiness data SHALL NOT expose token, Secret, Cookie, private URL, phone, email, raw source payload, full organization tree, full external profile, complete personnel details, source-system credentials, or real remediation execution details
- **AND** the readiness SHALL be treated as Admin producer diagnostics and future-store readiness evidence, not Gateway authorization facts, Insight fallback data, persistent audit records, saved operator notes, or execution approval decisions

### Requirement: Web admin SHALL show operator note persistence readiness from operator notes
Admin web UI SHALL let operators open read-only operator note persistence readiness from organization directory approval packet operator notes.

#### Scenario: Operator opens operator note persistence readiness
- **WHEN** an Admin operator opens persistence readiness from an approval packet operator notes panel
- **THEN** the UI SHALL call only the Admin operator note persistence readiness read API
- **AND** the UI SHALL show `storageScope=readiness_only`, `persistenceAllowed=false`, `storeDecisionRequired=true`, readiness status, idempotency key/components, permission checklist, retention checklist, audit semantics checklist, redaction checklist, manual review gate, cannotInfer, blocked reasons, safe summary, and sanitized JSON export
- **AND** the UI SHALL cover loading, empty, error, disabled, blocked, long text, and ready-for-design-review states
- **AND** the UI SHALL provide copy and export for sanitized persistence readiness JSON

#### Scenario: Operator note persistence readiness UI remains read-only
- **WHEN** the operator opens, refreshes, copies, exports, filters, or views operator note persistence readiness
- **THEN** the UI SHALL NOT save operator notes, create persistent audit records, trigger source-system repairs, write Admin organization records, write mapping records, trigger gateway projection publish, write Gateway facts, call API/Gateway/Insight internal services, or expose an execute/repair/save button
