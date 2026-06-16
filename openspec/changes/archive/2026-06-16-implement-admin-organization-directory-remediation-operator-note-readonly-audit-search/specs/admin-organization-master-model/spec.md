## ADDED Requirements

### Requirement: Admin SHALL expose organization directory remediation operator note readonly audit search
Admin SHALL provide a read-only organization directory remediation operator note readonly audit search API that derives searchable handoff/audit summaries from Admin-owned approval packet operator notes, operator note persistence readiness, approval packet audit, approval preview, remediation preflight, and action draft metadata.

#### Scenario: Operator searches operator note readonly audit summaries
- **WHEN** an authorized Admin operator requests operator note readonly audit search for an organization and note, readiness, packet, preview, draft, remediation run, action, risk, status, checklist alias, reason alias, or keyword filter
- **THEN** Admin SHALL evaluate only Admin-owned derived approval handoff metadata and readiness metadata
- **AND** Admin SHALL return `searchId`, `generatedAt`, `organizationId`, `searchScope`, `persistenceRequiredForHistoricalSearch`, `cannotInfer`, `items`, and `exportSummary`
- **AND** each item SHALL expose `auditSearchItemId`, `noteHash`, `readinessHash`, `packetHash`, `approvalPreviewHash`, `draftId`, `actionAlias`, `riskLevel`, `packetStatus`, `readinessStatus`, `checklistAliases`, `reasonAliases`, `displaySafeLabel`, `executionMode`, `autoExecutionAllowed`, `noteScope`, `retentionPolicy`, `storageScope`, `manualReviewOnly`, `redactedFields`, `sourceVersionSummary`, `orgVersionSummary`, `safeSummary`, and `markdownSummary`
- **AND** every item SHALL set `executionMode=manual_review_only`, `autoExecutionAllowed=false`, and `manualReviewOnly=true`
- **AND** Admin SHALL NOT create or update a persistent operator notes store, write organization master data, repair relationships, trigger gateway projection publish, write Gateway facts, or query API/Gateway/Insight internal databases

#### Scenario: Operator filters operator note readonly audit search
- **WHEN** the operator provides `noteId`, `noteHash`, `readinessId`, `readinessHash`, `packetAuditId`, `packetHash`, `approvalPreviewHash`, `draftId`, `remediationRunId`, or filters such as `actionAlias`, `reasonCode`, `checklistAlias`, `entityType`, `qualityStatus`, `sourceType`, `sourceConnectionIdHash`, `riskLevel`, `packetStatus`, `readinessStatus`, `keyword`, `limit`, `topN`, `includeHistorical`, or `historyMode`
- **THEN** Admin SHALL apply those filters through the operator notes and persistence readiness read models before deriving search items
- **AND** Admin SHALL return an empty search result for empty organization scope rather than scanning across organizations
- **AND** Admin SHALL return an empty search result when `qualityStatus=ready` is requested
- **AND** Admin SHALL reject unsupported entity/action/risk/status/readiness/history/limit values with an operator-readable error
- **AND** Admin SHALL return an empty search result when a requested readiness, note, packet, preview, or draft identifier does not match any generated Admin-owned derived metadata

#### Scenario: Historical operator note search requires persistence
- **WHEN** the operator requests historical search beyond the currently derived approval packet/operator note/readiness metadata available in Admin memory or read models
- **THEN** Admin SHALL fail closed by setting `persistenceRequiredForHistoricalSearch=true`
- **AND** Admin SHALL include `cannotInfer` entries explaining that cross-run completeness, saved operator comments, real handoff acknowledgements, and durable retention evidence require a future Admin-owned persistent operator notes store
- **AND** Admin SHALL NOT synthesize historical handoff records, scan unrelated organizations, or create a persistent store/schema as part of the search request

#### Scenario: Operator note readonly audit search failures fail closed
- **WHEN** the operator is not authorized for the requested organization
- **THEN** Admin SHALL deny the request through the normal organization-scoped authorization path
- **WHEN** Admin-owned readiness, operator notes, audit, approval preview, preflight, or action draft generation returns an internal error
- **THEN** Admin SHALL return an error response rather than a successful search item
- **WHEN** the matching note/readiness is blocked, readiness-only, missing samples, or cannot be generated
- **THEN** Admin SHALL keep `autoExecutionAllowed=false`, include stable blocked reasons and `cannotInfer`, and avoid representing the search item as executable or persisted
- **AND** Admin SHALL NOT include token, Cookie, private URL, source payload, raw organization tree, credential details, phone, email, or complete personnel details in the error response

#### Scenario: Operator note readonly audit search export remains sanitized
- **WHEN** Admin returns, copies, or exports operator note readonly audit search data
- **THEN** `items`, `exportSummary`, and `markdownSummary` SHALL expose only stable hashes, display-safe labels, entity type, source type, quality/readiness/packet status aliases, reason/checklist aliases, lifecycle status, hashed source connection identifiers, risk/checklist/approval summary, manual-review-only status, cannotInfer, and source/org version summaries
- **AND** exported data SHALL NOT expose token, Secret, Cookie, private URL, phone, email, raw source payload, full organization tree, full external profile, complete personnel details, source-system credentials, saved operator comments, or real remediation execution details
- **AND** the search result SHALL be treated as Admin producer diagnostics and handoff review evidence, not Gateway authorization facts, Insight fallback data, persistent audit records, saved operator notes, or execution approval decisions

### Requirement: Web admin SHALL show operator note readonly audit search from operator notes and readiness
Admin web UI SHALL let operators open read-only operator note / approval handoff audit search from organization directory approval packet operator notes and operator note persistence readiness panels.

#### Scenario: Operator opens operator note readonly audit search
- **WHEN** an Admin operator opens readonly audit search from an approval packet operator notes panel or persistence readiness panel
- **THEN** the UI SHALL call only the Admin operator note readonly audit search read API
- **AND** the UI SHALL provide filters for safe identifiers, action alias, reason/checklist alias, risk, packet status, readiness status, keyword, and historical boundary
- **AND** the UI SHALL show `persistenceRequiredForHistoricalSearch`, `manualReviewOnly`, `autoExecutionAllowed=false`, storage/note scope, retention policy, readiness-only state, cannotInfer, blocked reasons, safe summary, redacted fields, and sanitized JSON/Markdown export
- **AND** the UI SHALL cover loading, empty, error, disabled, blocked/readiness-only, cannotInfer, long text, and ready-for-review states

#### Scenario: Operator note readonly audit search UI remains read-only
- **WHEN** the operator opens, refreshes, filters, copies, exports, or views operator note readonly audit search details
- **THEN** the UI SHALL NOT save operator notes, create persistent audit records, trigger source-system repairs, write Admin organization records, write mapping records, trigger gateway projection publish, write Gateway facts, call API/Gateway/Insight internal services, or expose an execute/repair/save button
- **AND** the UI SHALL make historical limitations visible when `persistenceRequiredForHistoricalSearch=true` rather than implying durable search coverage
