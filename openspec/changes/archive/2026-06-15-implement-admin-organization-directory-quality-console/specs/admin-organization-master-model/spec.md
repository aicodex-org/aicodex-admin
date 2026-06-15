## ADDED Requirements

### Requirement: Admin SHALL expose organization directory quality details
Admin SHALL provide a read-only organization directory quality API for Admin-owned `PlatformDepartment`, `PlatformUser`, and `PlatformMembership` records so operators can locate concrete master-data quality problems behind organization readiness summaries.

#### Scenario: Operator lists quality details by entity type
- **WHEN** an authorized Admin operator requests directory quality details for an organization and `entityType=department`, `entityType=user`, or `entityType=membership`
- **THEN** Admin SHALL evaluate only Admin-owned platform organization master data and related Admin-owned mapping/lineage records
- **AND** Admin SHALL return paged records with `qualityStatus`, stable `reasonCodes`, lifecycle status, source summary, sync batch/version summary, and remediation hints
- **AND** Admin SHALL NOT query API, Gateway, or Insight internal databases
- **AND** Admin SHALL NOT trigger gateway projection publish or write gateway authorization facts

#### Scenario: Operator filters quality details
- **WHEN** the operator provides filters such as `keyword`, `sourceType`, `sourceConnectionIdHash`, `qualityStatus`, `reasonCode`, `lifecycleStatus`, `p`, or `pageSize`
- **THEN** Admin SHALL apply those filters inside the Admin directory quality read model
- **AND** Admin SHALL return `items`, `total`, `page`, `pageSize`, and summary counts for the filtered result
- **AND** Admin SHALL return an empty result rather than exposing data from another organization when no record matches

#### Scenario: Invalid directory quality query fails closed
- **WHEN** the operator provides an unsupported `entityType`, unsupported status filter, or invalid pagination value
- **THEN** Admin SHALL reject the request with an operator-readable error
- **AND** Admin SHALL NOT silently return an empty success response that could be mistaken for a clean directory

#### Scenario: Directory details classify retry and repair blockers
- **WHEN** a department has missing/disabled/untrusted source lineage, duplicate source keys, missing source keys, an orphan parent, stale source freshness, or non-active lifecycle
- **THEN** Admin SHALL classify the department with stable reason codes and `qualityStatus=blocked` for fail-closed blockers or `qualityStatus=warning` for repairable non-blocking diagnostics
- **WHEN** a user has missing/duplicate admin subject, missing or untrusted API user mapping, unavailable lineage freshness, source freshness gaps, or non-active lifecycle
- **THEN** Admin SHALL classify the user with stable reason codes and `qualityStatus=blocked` or `qualityStatus=warning`
- **WHEN** a membership references a missing active user, missing active department, disabled/untrusted source lineage, stale source freshness, or non-active lifecycle
- **THEN** Admin SHALL classify the membership with stable reason codes and `qualityStatus=blocked` or `qualityStatus=warning`

#### Scenario: Directory quality response is sanitized
- **WHEN** Admin returns directory quality list or detail data
- **THEN** the response SHALL expose only local Admin identifiers, display labels, source type, hashed source connection/external identifiers, lifecycle/mapping/status fields, sync batch/version summaries, reason codes, and remediation hints
- **AND** the response SHALL NOT expose token, Secret, Cookie, private URL, phone, email, full organization tree payload, raw source response, or complete external profile
- **AND** the response SHALL be treated as Admin producer diagnostics, not Gateway authorization facts or Insight derived metadata

### Requirement: Web admin SHALL provide organization directory quality console
Admin web UI SHALL expose a dedicated organization directory quality console for operators to inspect Admin-owned directory quality details without overloading the Platform API mapping page.

#### Scenario: Operator opens the directory quality console
- **WHEN** an Admin operator opens the organization directory quality page
- **THEN** the UI SHALL provide organization input/selection, entity type tabs or segmented control, filters, a paged table, refresh action, and an item detail panel
- **AND** the UI SHALL show quality status, reason codes, source/batch/version summary, and remediation hints for selected records
- **AND** the UI SHALL include loading, empty, no-match, and error states

#### Scenario: Directory quality console remains read-only
- **WHEN** the operator filters, refreshes, opens details, or changes page
- **THEN** the UI SHALL call only the Admin directory quality read API
- **AND** the UI SHALL NOT trigger gateway projection publish, write mapping records, write gateway authorization facts, or call API/Gateway/Insight internal services
