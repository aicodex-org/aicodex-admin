## ADDED Requirements

### Requirement: Admin SHALL expose organization directory remediation action drafts
Admin SHALL provide a read-only organization directory remediation action draft API that turns Admin-owned directory quality remediation actions into sanitized manual-review draft checklists.

#### Scenario: Operator reads remediation action drafts
- **WHEN** an authorized Admin operator requests remediation action drafts for an organization
- **THEN** Admin SHALL evaluate only Admin-owned organization directory quality details and remediation action metadata
- **AND** Admin SHALL return draft groups with `draftId`, `actionAlias`, `priority`, `entityType`, `affectedCount`, `safeSummary`, `blockedReason`, `preconditions`, `operatorSteps`, `executionMode`, and sanitized samples
- **AND** every draft SHALL set `executionMode=manual_review_only` or an equivalent value that prevents the response from being interpreted as an executable repair
- **AND** Admin SHALL NOT write organization master data, repair relationships, trigger gateway projection publish, write Gateway facts, or query API/Gateway/Insight internal databases

#### Scenario: Operator filters remediation action drafts
- **WHEN** the operator provides filters such as `actionAlias`, `reasonCode`, `entityType`, `qualityStatus`, `sourceType`, `sourceConnectionIdHash`, `keyword`, `limit`, or `topN`
- **THEN** Admin SHALL apply those filters to the Admin directory quality read model before generating drafts
- **AND** Admin SHALL default to blocked and warning quality records
- **AND** Admin SHALL return an empty draft result when `qualityStatus=ready` is requested
- **AND** Admin SHALL return an empty draft result for empty organization scope rather than scanning across organizations
- **AND** Admin SHALL reject unsupported entity/status/action/limit values with an operator-readable error

#### Scenario: Remediation action draft failures fail closed
- **WHEN** the operator is not authorized for the requested organization
- **THEN** Admin SHALL deny the request through the normal organization-scoped authorization path
- **WHEN** the Admin-owned directory quality read model returns an internal error
- **THEN** Admin SHALL return an error response rather than a successful empty draft that could be mistaken for a clean state
- **AND** Admin SHALL NOT include token, Cookie, private URL, source payload, raw organization tree, or credential details in the error response

#### Scenario: Remediation action draft samples remain sanitized
- **WHEN** Admin returns or exports remediation action draft data
- **THEN** draft samples SHALL expose only stable hashes, display-safe labels, entity type, source type, quality status, reason/status codes, lifecycle status, hashed source connection identifiers, and source/org version summaries
- **AND** draft samples SHALL NOT expose token, Secret, Cookie, private URL, phone, email, raw source payload, full organization tree, full external profile, complete personnel details, or source-system credentials
- **AND** the draft SHALL be treated as Admin producer diagnostics, not Gateway authorization facts or Insight fallback data

### Requirement: Web admin SHALL show remediation action drafts from organization directory plans
Admin web UI SHALL let operators open read-only remediation action drafts from the organization directory remediation plan panel.

#### Scenario: Operator opens an action draft
- **WHEN** an Admin operator clicks a draft/detail action for a remediation plan group
- **THEN** the UI SHALL open a drawer or panel that calls only the Admin remediation action draft read API
- **AND** the UI SHALL show `executionMode=manual_review_only`, priority, affected count, blocked reason, preconditions, operator steps, and sanitized samples
- **AND** the UI SHALL provide copy/export actions for sanitized draft JSON

#### Scenario: Remediation action draft UI remains read-only
- **WHEN** the operator opens, refreshes, copies, or exports a draft
- **THEN** the UI SHALL NOT trigger source-system repairs, write Admin organization records, write mapping records, trigger gateway projection publish, write Gateway facts, or call API/Gateway/Insight internal services
