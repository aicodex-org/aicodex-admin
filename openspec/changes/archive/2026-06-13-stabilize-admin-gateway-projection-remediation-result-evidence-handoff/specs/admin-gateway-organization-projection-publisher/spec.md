## ADDED Requirements

### Requirement: Gateway projection remediation result evidence handoff MUST gate the next review step
Admin SHALL provide a local, read-only remediation result evidence handoff wrapper for gateway projection operator coordination. The wrapper SHALL consume only sanitized alias, count and status summaries for mapping remediation, source freshness remediation, deploy/runtime shape, fixture or `subjectCount>=1` authorization, and controlled smoke evidence prerequisites. It SHALL return stable result fields and next safe action without triggering publish, refresh, fixture writes, database mutations, mapping confirmation, API/Insight queries, gateway ingestion or gateway authorization fact writes.

#### Scenario: Cleared mapping remediation still requires authoritative mapping evidence
- **WHEN** sanitized result evidence reports mapping remediation cleared
- **THEN** the handoff SHALL require aliases showing first-class `PlatformApiUserMapping.ApiUserId`, trusted mapping statuses and lifecycle readiness
- **AND** the handoff SHALL include the mapping evidence alias in `evidenceAliases`
- **AND** it SHALL NOT accept display name, phone, email, legacy lineage or user properties as runtime projection join keys

#### Scenario: Source freshness remediation must be Admin-owned
- **WHEN** sanitized result evidence reports source freshness remediation cleared
- **THEN** the handoff SHALL require Admin-owned source freshness, source snapshot, `OrgSyncBatch` or sourceVersion/freshness evidence aliases
- **AND** owner handoff SHALL remain scoped to `admin_source_owner` when evidence is missing or stale
- **AND** it SHALL NOT ask API, Insight or Gateway owners to compute projection locally

#### Scenario: Deploy and runtime shape must be confirmed
- **WHEN** sanitized result evidence reports deploy/runtime remediation cleared
- **THEN** the handoff SHALL require current Admin runtime shape or deploy confirmation aliases
- **AND** missing deploy/runtime confirmation SHALL block the next controlled smoke evidence review
- **AND** it SHALL NOT trigger publish, refresh, read model rebuild, gateway ingestion or authorization facts

#### Scenario: Fixture or subject authorization gap remains blocked
- **WHEN** fixture evidence is missing, not authorized, or `subjectCount>=1` is not proven by authorized controlled evidence
- **THEN** the handoff SHALL return a blocked status
- **AND** owner SHALL be `fixture_owner`
- **AND** minimum unblock conditions SHALL require authorized controlled active/tombstone subject fixture or sanitized subject count evidence before rerunning read-only checks
- **AND** the handoff SHALL state that empty subject evidence is not full projection business success

#### Scenario: Controlled smoke evidence review is allowed only after all local result evidence is clear
- **WHEN** mapping, source, deploy/runtime, fixture authorization and controlled smoke evidence prerequisites are all cleared by sanitized aliases
- **THEN** the handoff SHALL return `status=ready-for-controlled-smoke-evidence-review`
- **AND** `nextSafeAction` SHALL allow only the next controlled smoke evidence review or preflight step
- **AND** the handoff SHALL NOT describe the result as real publish success, gateway ingestion success, authorization facts success, API/Gateway/Insight success, production readiness or full-success

#### Scenario: Sensitive or overclaimed result evidence fails closed
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, raw response body, real fixture/DB details, real write signals or full-success/API/Gateway/Insight success claims
- **THEN** the handoff SHALL return `status=redaction-required`, `status=red-line-blocked` or `status=overclaim-full-success`
- **AND** it SHALL NOT echo sensitive values or complete responses
- **AND** `nextSafeAction` SHALL remain blocked until the evidence is sanitized

#### Scenario: Unknown remediation result aliases remain safe
- **WHEN** sanitized result evidence contains an unrecognized alias
- **THEN** the handoff SHALL keep the result blocked
- **AND** owner SHALL be `admin_operator`
- **AND** minimum unblock conditions SHALL require replacing the unknown alias with a stable Admin owner result alias
- **AND** the handoff SHALL NOT infer API, Insight or Gateway authorization facts
