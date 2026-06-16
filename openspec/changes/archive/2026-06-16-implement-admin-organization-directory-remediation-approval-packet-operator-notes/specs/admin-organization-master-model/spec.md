## ADDED Requirements

### Requirement: Admin SHALL expose organization directory remediation approval packet operator notes
Admin SHALL provide a read-only organization directory remediation approval packet operator notes API that derives sanitized handoff note drafts from Admin-owned approval packet audit, approval preview, remediation preflight, and action draft metadata.

#### Scenario: Operator generates approval packet handoff notes
- **WHEN** an authorized Admin operator requests operator notes for an organization and packet, preview, draft, action, risk, status, or keyword filter
- **THEN** Admin SHALL evaluate only Admin-owned approval packet audit, approval preview, preflight, and action draft metadata
- **AND** Admin SHALL return `noteId`, `noteHash`, `packetHash`, `approvalPreviewHash`, `draftId`, `actionAlias`, `executionMode`, `autoExecutionAllowed`, `noteScope`, `retentionPolicy`, `noteFormat`, `handoffSummary`, `riskSummary`, `statusSummary`, `checklistSummary`, `cannotInfer`, `operatorNextSteps`, `sampleStableHashes`, `exportSummary`, and `markdownSummary`
- **AND** every note SHALL set `executionMode=manual_review_only`
- **AND** every note SHALL set `autoExecutionAllowed=false`
- **AND** P0 notes SHALL set `noteScope=derived_note_draft` and `retentionPolicy=not_persisted` unless a later Admin-owned persistent notes store is explicitly introduced
- **AND** Admin SHALL NOT write organization master data, repair relationships, trigger gateway projection publish, write Gateway facts, or query API/Gateway/Insight internal databases

#### Scenario: Operator filters approval packet operator notes
- **WHEN** the operator provides `noteId`, `noteHash`, `packetAuditId`, `packetHash`, `approvalPreviewHash`, `draftId`, or filters such as `actionAlias`, `reasonCode`, `entityType`, `qualityStatus`, `sourceType`, `sourceConnectionIdHash`, `riskLevel`, `packetStatus`, `keyword`, `limit`, or `topN`
- **THEN** Admin SHALL apply those filters through the approval packet audit and approval preview read models before deriving note drafts
- **AND** Admin SHALL return an empty notes result for empty organization scope rather than scanning across organizations
- **AND** Admin SHALL return an empty notes result when `qualityStatus=ready` is requested
- **AND** Admin SHALL reject unsupported entity/action/risk/status/limit values with an operator-readable error
- **AND** Admin SHALL return an empty notes result when a requested note, packet, or preview identifier does not match any generated approval packet audit

#### Scenario: Approval packet operator notes fail closed
- **WHEN** the operator is not authorized for the requested organization
- **THEN** Admin SHALL deny the request through the normal organization-scoped authorization path
- **WHEN** Admin-owned audit, approval preview, preflight, or action draft generation returns an internal error
- **THEN** Admin SHALL return an error response rather than a successful note draft
- **WHEN** the matching approval packet is blocked, has no samples, or cannot be generated
- **THEN** Admin SHALL keep `autoExecutionAllowed=false`, include stable blocked reasons, checklist blockers, and `cannotInfer`, and avoid representing the notes as an executable approval
- **AND** Admin SHALL NOT include token, Cookie, private URL, source payload, raw organization tree, or credential details in the error response

#### Scenario: Approval packet operator notes remain sanitized
- **WHEN** Admin returns or exports approval packet operator notes
- **THEN** `handoffSummary`, `riskSummary`, `statusSummary`, `checklistSummary`, `cannotInfer`, `sampleStableHashes`, `exportSummary`, and `markdownSummary` SHALL expose only stable hashes, display-safe labels, entity type, source type, quality status, reason/status codes, lifecycle status, hashed source connection identifiers, risk/checklist/approval summary, manual-review-only status, and source/org version summaries
- **AND** notes and export SHALL NOT expose token, Secret, Cookie, private URL, phone, email, raw source payload, full organization tree, full external profile, complete personnel details, or source-system credentials
- **AND** the operator notes SHALL be treated as Admin producer diagnostics and handoff drafts, not Gateway authorization facts, Insight fallback data, persistent audit records, or execution approval decisions

### Requirement: Web admin SHALL show remediation approval packet operator notes from approval packet audit
Admin web UI SHALL let operators open read-only remediation approval packet operator notes from organization directory approval packet audit details.

#### Scenario: Operator opens approval packet operator notes
- **WHEN** an Admin operator opens operator notes from an approval preview or approval packet audit panel
- **THEN** the UI SHALL call only the Admin remediation approval packet operator notes read API
- **AND** the UI SHALL show `noteScope=derived_note_draft`, `retentionPolicy=not_persisted`, `executionMode=manual_review_only`, `autoExecutionAllowed=false`, handoff summary, risk/status/checklist summary, cannotInfer, operator next steps, sample stable hashes, and JSON/Markdown export
- **AND** the UI SHALL cover loading, empty, error, disabled, blocked, long text, and ready states
- **AND** the UI SHALL provide copy and export for sanitized approval packet operator notes JSON/Markdown

#### Scenario: Approval packet operator notes UI remains read-only
- **WHEN** the operator opens, refreshes, copies, exports, filters, or views approval packet operator notes
- **THEN** the UI SHALL NOT trigger source-system repairs, write Admin organization records, write mapping records, trigger gateway projection publish, write Gateway facts, call API/Gateway/Insight internal services, or expose an execute/repair button
