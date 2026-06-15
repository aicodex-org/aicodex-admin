## ADDED Requirements

### Requirement: Admin SHALL expose organization directory remediation execution approval preview
Admin SHALL provide a read-only organization directory remediation execution approval preview API that aggregates Admin-owned action draft and remediation preflight results before any future repair execution.

#### Scenario: Operator reads remediation execution approval preview
- **WHEN** an authorized Admin operator requests an execution approval preview for an organization and draft or action filter
- **THEN** Admin SHALL evaluate only Admin-owned organization directory action draft and remediation preflight metadata
- **AND** Admin SHALL return `approvalPreviewId`, `approvalPreviewHash`, `draftId`, `actionAlias`, `executionMode`, `autoExecutionAllowed`, `affectedCount`, `riskLevel`, `preconditions`, `blockedReasons`, `requiredApprovals`, `operatorChecklist`, `safeSummary`, `exportSummary`, and sample stable hashes
- **AND** every approval preview SHALL set `executionMode=manual_review_only`
- **AND** every approval preview SHALL set `autoExecutionAllowed=false`
- **AND** Admin SHALL NOT write organization master data, repair relationships, trigger gateway projection publish, write Gateway facts, or query API/Gateway/Insight internal databases

#### Scenario: Operator filters remediation execution approval preview
- **WHEN** the operator provides `draftId` or filters such as `actionAlias`, `reasonCode`, `entityType`, `qualityStatus`, `sourceType`, `sourceConnectionIdHash`, `keyword`, `limit`, or `topN`
- **THEN** Admin SHALL apply those filters through the action draft and preflight read models before generating the approval preview
- **AND** Admin SHALL return an empty approval preview result for empty organization scope rather than scanning across organizations
- **AND** Admin SHALL return an empty approval preview result when `qualityStatus=ready` is requested
- **AND** Admin SHALL reject unsupported entity/action/limit values with an operator-readable error
- **AND** Admin SHALL return a blocked approval preview when a requested `draftId` does not match any generated draft or preflight result

#### Scenario: Remediation execution approval preview failures fail closed
- **WHEN** the operator is not authorized for the requested organization
- **THEN** Admin SHALL deny the request through the normal organization-scoped authorization path
- **WHEN** the Admin-owned action draft or remediation preflight generation returns an internal error
- **THEN** Admin SHALL return an error response rather than a successful ready-for-approval preview
- **WHEN** the matching preflight is blocked, has no sample digests, or cannot be generated
- **THEN** Admin SHALL set `autoExecutionAllowed=false`, include stable blocked reasons or checklist blockers, and avoid representing the preview as executable
- **AND** Admin SHALL NOT include token, Cookie, private URL, source payload, raw organization tree, or credential details in the error response

#### Scenario: Remediation execution approval preview samples remain sanitized
- **WHEN** Admin returns or exports remediation execution approval preview data
- **THEN** sample stable hashes and `exportSummary` SHALL expose only stable hashes, display-safe labels, entity type, source type, quality status, reason/status codes, lifecycle status, hashed source connection identifiers, and source/org version summaries
- **AND** samples and export SHALL NOT expose token, Secret, Cookie, private URL, phone, email, raw source payload, full organization tree, full external profile, complete personnel details, or source-system credentials
- **AND** the approval preview SHALL be treated as Admin producer diagnostics, not Gateway authorization facts or Insight fallback data

### Requirement: Web admin SHALL show remediation execution approval preview from action drafts and preflight
Admin web UI SHALL let operators open read-only remediation execution approval preview from organization directory action draft or preflight details.

#### Scenario: Operator opens remediation execution approval preview
- **WHEN** an Admin operator opens approval preview for an action draft or preflight
- **THEN** the UI SHALL call only the Admin remediation execution approval preview read API
- **AND** the UI SHALL show `executionMode=manual_review_only`, `autoExecutionAllowed=false`, affected count, risk level, required approvals, operator checklist, safe summary, blocked reasons, and sample stable hashes
- **AND** the UI SHALL cover loading, empty, error, disabled, blocked, and ready-for-approval states
- **AND** the UI SHALL provide copy and export for sanitized approval preview JSON

#### Scenario: Remediation execution approval preview UI remains read-only
- **WHEN** the operator opens, refreshes, copies, or exports approval preview
- **THEN** the UI SHALL NOT trigger source-system repairs, write Admin organization records, write mapping records, trigger gateway projection publish, write Gateway facts, call API/Gateway/Insight internal services, or expose an execute/repair button
