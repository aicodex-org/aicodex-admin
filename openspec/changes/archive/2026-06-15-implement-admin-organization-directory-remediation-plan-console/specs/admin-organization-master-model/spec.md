## ADDED Requirements

### Requirement: Admin SHALL expose organization directory remediation plans
Admin SHALL provide a read-only organization directory remediation plan API that aggregates Admin-owned directory quality details into prioritized operator actions.

#### Scenario: Operator reads remediation plan
- **WHEN** an authorized Admin operator requests a remediation plan for an organization
- **THEN** Admin SHALL evaluate Admin-owned directory quality details for `PlatformDepartment`, `PlatformUser`, and `PlatformMembership`
- **AND** Admin SHALL return prioritized plan groups with stable `actionAlias`, `priority`, `reasonCodes`, `affectedCounts`, sanitized samples, source/org version summaries, safe summaries, operator actions, and blocked reasons
- **AND** Admin SHALL NOT execute repairs, write gateway authorization facts, trigger gateway projection publish, or query API/Gateway/Insight internal databases

#### Scenario: Remediation plan maps quality reasons to operator actions
- **WHEN** source connection, freshness, lineage, mapping, duplicate identity, lifecycle, department, user, or membership quality reasons are present
- **THEN** Admin SHALL map them into stable action aliases such as `source_refresh`, `blocked_by_credentials`, `mapping_review`, `identity_conflict_review`, `lifecycle_cleanup`, `membership_repair`, and `manual_investigation`
- **AND** Admin SHALL assign deterministic priorities so credentials/source blockers and identity conflicts sort before mapping, membership, lifecycle, and manual investigation work

#### Scenario: Operator filters remediation plan
- **WHEN** the operator provides filters such as `entityType`, `qualityStatus`, `reasonCode`, `sourceType`, `sourceConnectionIdHash`, `keyword`, `limit`, or `topN`
- **THEN** Admin SHALL apply those filters to the Admin directory quality read model before aggregating the plan
- **AND** Admin SHALL aggregate only `blocked` and `warning` records by default
- **AND** Admin SHALL return an empty plan when `qualityStatus=ready` is requested
- **AND** Admin SHALL reject unsupported entity/status/limit values with an operator-readable error
- **AND** Admin SHALL return an empty plan for empty organization scope rather than scanning across organizations

#### Scenario: Remediation plan export remains sanitized
- **WHEN** Admin returns or exports remediation plan data
- **THEN** the response SHALL include only plan keys, priorities, action aliases, counts, reason codes, safe summaries, sanitized entity IDs or hashes, source/org version summaries, and operator action text
- **AND** the response SHALL NOT expose token, Secret, Cookie, private URL, phone, email, full organization tree payload, raw source response, complete external profile, or execute any remediation
- **AND** the plan SHALL be treated as Admin producer diagnostics, not Gateway authorization facts or Insight fallback data

### Requirement: Web admin SHALL show organization directory remediation plan
Admin web UI SHALL show a read-only remediation plan panel for organization directory quality issues.

#### Scenario: Operator reviews prioritized remediation plan
- **WHEN** an Admin operator opens the organization directory quality page
- **THEN** the UI SHALL show remediation plan groups for the selected organization and filters
- **AND** the UI SHALL show priority, action alias, affected count, reason codes, sanitized samples, safe summary, and operator actions
- **AND** the UI SHALL provide refresh and sanitized export actions that do not write data

#### Scenario: Remediation plan UI remains read-only
- **WHEN** the operator refreshes, filters, opens details, or exports the plan
- **THEN** the UI SHALL call only the Admin remediation plan read API or perform client-side download of sanitized data
- **AND** the UI SHALL NOT trigger gateway projection publish, write mapping records, write gateway authorization facts, call API/Gateway/Insight internal services, or perform source-system repairs
