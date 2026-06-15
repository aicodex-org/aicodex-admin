## ADDED Requirements

### Requirement: Admin SHALL expose organization directory remediation preflight
Admin SHALL provide a read-only remediation preflight API that evaluates Admin-owned organization directory action drafts before any future manual repair execution.

#### Scenario: Operator reads remediation preflight
- **WHEN** an authorized Admin operator requests remediation preflight for an organization and draft or action filter
- **THEN** Admin SHALL evaluate only Admin-owned organization directory quality details and remediation action draft metadata
- **AND** Admin SHALL return `preflightId`, `draftId`, `actionAlias`, `executionMode`, `readyForManualReview`, `autoExecutionAllowed`, `blockedReasons`, `preconditions`, `safetyChecklist`, `affectedCounts`, `sampleDigests`, `exportSummary`, and `operatorNextSteps`
- **AND** every preflight SHALL set `executionMode=manual_review_only`
- **AND** every preflight SHALL set `autoExecutionAllowed=false`
- **AND** Admin SHALL NOT write organization master data, repair relationships, trigger gateway projection publish, write Gateway facts, or query API/Gateway/Insight internal databases

#### Scenario: Operator filters remediation preflight
- **WHEN** the operator provides `draftId` or filters such as `actionAlias`, `reasonCode`, `entityType`, `qualityStatus`, `sourceType`, `sourceConnectionIdHash`, `keyword`, `limit`, or `topN`
- **THEN** Admin SHALL apply those filters to the action draft and directory quality read models before generating preflight
- **AND** Admin SHALL return an empty preflight result for empty organization scope rather than scanning across organizations
- **AND** Admin SHALL return an empty preflight result when `qualityStatus=ready` is requested
- **AND** Admin SHALL reject unsupported entity/action/limit values with an operator-readable error
- **AND** Admin SHALL return a blocked preflight when a requested `draftId` does not match any generated draft

#### Scenario: Remediation preflight failures fail closed
- **WHEN** the operator is not authorized for the requested organization
- **THEN** Admin SHALL deny the request through the normal organization-scoped authorization path
- **WHEN** the Admin-owned directory quality read model or action draft generation returns an internal error
- **THEN** Admin SHALL return an error response rather than a successful ready preflight
- **AND** Admin SHALL NOT include token, Cookie, private URL, source payload, raw organization tree, or credential details in the error response

#### Scenario: Remediation preflight samples remain sanitized
- **WHEN** Admin returns or exports remediation preflight data
- **THEN** `sampleDigests` SHALL expose only stable hashes, display-safe labels, entity type, source type, quality status, reason/status codes, lifecycle status, hashed source connection identifiers, and source/org version summaries
- **AND** `sampleDigests` SHALL NOT expose token, Secret, Cookie, private URL, phone, email, raw source payload, full organization tree, full external profile, complete personnel details, or source-system credentials
- **AND** the preflight SHALL be treated as Admin producer diagnostics, not Gateway authorization facts or Insight fallback data

### Requirement: Web admin SHALL show remediation preflight from action drafts
Admin web UI SHALL let operators open read-only remediation preflight from organization directory action draft details.

#### Scenario: Operator opens remediation preflight
- **WHEN** an Admin operator opens preflight for an action draft
- **THEN** the UI SHALL call only the Admin remediation preflight read API
- **AND** the UI SHALL show `executionMode=manual_review_only`, `autoExecutionAllowed=false`, ready/blocker state, safety checklist, affected counts, operator next steps, and sanitized sample digests
- **AND** the UI SHALL provide export for sanitized preflight JSON

#### Scenario: Remediation preflight UI remains read-only
- **WHEN** the operator opens, refreshes, or exports preflight
- **THEN** the UI SHALL NOT trigger source-system repairs, write Admin organization records, write mapping records, trigger gateway projection publish, write Gateway facts, or call API/Gateway/Insight internal services
