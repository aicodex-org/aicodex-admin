## ADDED Requirements

### Requirement: Admin SHALL expose organization directory remediation approval packet audit
Admin SHALL provide a read-only organization directory remediation approval packet audit API that derives approval packet search/history records from Admin-owned approval preview, remediation preflight, and action draft metadata.

#### Scenario: Operator searches remediation approval packet audit
- **WHEN** an authorized Admin operator requests approval packet audit for an organization and packet, preview, draft, action, risk, status, or keyword filter
- **THEN** Admin SHALL evaluate only Admin-owned organization directory approval preview, preflight, and action draft metadata
- **AND** Admin SHALL return `packetAuditId`, `packetHash`, `approvalPreviewHash`, `draftId`, `actionAlias`, `executionMode`, `autoExecutionAllowed`, `eventTypes`, `packetStatus`, `riskLevel`, `affectedCount`, `blockedReasons`, `requiredApprovals`, `operatorChecklistDigest`, `sampleStableHashes`, `exportSummary`, `storageScope`, and `retentionPolicy`
- **AND** every audit record SHALL set `executionMode=manual_review_only`
- **AND** every audit record SHALL set `autoExecutionAllowed=false`
- **AND** P0 audit records SHALL set `storageScope=derived_non_persistent` and `retentionPolicy=not_persisted` unless a later Admin-owned persistent audit store is explicitly introduced
- **AND** Admin SHALL NOT write organization master data, repair relationships, trigger gateway projection publish, write Gateway facts, or query API/Gateway/Insight internal databases

#### Scenario: Operator filters remediation approval packet audit
- **WHEN** the operator provides `packetAuditId`, `packetHash`, `approvalPreviewHash`, `draftId`, or filters such as `actionAlias`, `reasonCode`, `entityType`, `qualityStatus`, `sourceType`, `sourceConnectionIdHash`, `riskLevel`, `packetStatus`, `keyword`, `limit`, or `topN`
- **THEN** Admin SHALL apply those filters through the approval preview and preflight read models before deriving audit records
- **AND** Admin SHALL return an empty audit result for empty organization scope rather than scanning across organizations
- **AND** Admin SHALL return an empty audit result when `qualityStatus=ready` is requested
- **AND** Admin SHALL reject unsupported entity/action/risk/status/limit values with an operator-readable error
- **AND** Admin SHALL return an empty audit result when a requested packet or preview identifier does not match any generated approval preview

#### Scenario: Remediation approval packet audit failures fail closed
- **WHEN** the operator is not authorized for the requested organization
- **THEN** Admin SHALL deny the request through the normal organization-scoped authorization path
- **WHEN** Admin-owned approval preview, preflight, or action draft generation returns an internal error
- **THEN** Admin SHALL return an error response rather than a successful audit record
- **WHEN** the matching approval preview is blocked, has no samples, or cannot be generated
- **THEN** Admin SHALL keep `autoExecutionAllowed=false`, include stable blocked reasons or checklist blockers, and avoid representing the packet as executable
- **AND** Admin SHALL NOT include token, Cookie, private URL, source payload, raw organization tree, or credential details in the error response

#### Scenario: Remediation approval packet audit samples remain sanitized
- **WHEN** Admin returns or exports remediation approval packet audit data
- **THEN** `sampleStableHashes`, `operatorChecklistDigest`, and `exportSummary` SHALL expose only stable hashes, display-safe labels, entity type, source type, quality status, reason/status codes, lifecycle status, hashed source connection identifiers, risk/checklist/approval summary, and source/org version summaries
- **AND** samples and export SHALL NOT expose token, Secret, Cookie, private URL, phone, email, raw source payload, full organization tree, full external profile, complete personnel details, or source-system credentials
- **AND** the approval packet audit SHALL be treated as Admin producer diagnostics, not Gateway authorization facts or Insight fallback data

### Requirement: Web admin SHALL show remediation approval packet audit from approval preview
Admin web UI SHALL let operators open read-only remediation approval packet audit/search/history from organization directory approval preview details.

#### Scenario: Operator opens remediation approval packet audit
- **WHEN** an Admin operator opens approval packet audit from an action draft, preflight, or approval preview panel
- **THEN** the UI SHALL call only the Admin remediation approval packet audit read API
- **AND** the UI SHALL show `storageScope=derived_non_persistent`, `retentionPolicy=not_persisted`, `executionMode=manual_review_only`, `autoExecutionAllowed=false`, packet status, event types, risk level, affected count, required approvals, checklist digest, blocked reasons, safe/export summary, and sample stable hashes
- **AND** the UI SHALL cover loading, empty, error, disabled, blocked, long text, and ready states
- **AND** the UI SHALL provide copy and export for sanitized approval packet audit JSON

#### Scenario: Remediation approval packet audit UI remains read-only
- **WHEN** the operator opens, refreshes, copies, exports, filters, or views approval packet audit history
- **THEN** the UI SHALL NOT trigger source-system repairs, write Admin organization records, write mapping records, trigger gateway projection publish, write Gateway facts, call API/Gateway/Insight internal services, or expose an execute/repair button
