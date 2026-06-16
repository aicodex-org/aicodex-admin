## ADDED Requirements

### Requirement: Gateway projection controlled smoke execution handoff MUST remain local-only and fail closed
Admin SHALL provide a local, read-only controlled smoke execution handoff wrapper for gateway projection operator coordination. The wrapper SHALL consume only sanitized summaries from controlled smoke preflight, controlled smoke evidence readiness, controlled smoke release runbook, operator remediation handoff and remediation result evidence handoff. It SHALL return bounded execution-prep status, stable blocker/remediation aliases, missing prerequisites, operator actions, owner handoff limits, red-line flags, cannot-infer boundaries and evidence package metadata without triggering real endpoint calls, publish, refresh, fixture writes, database mutations, API/Insight queries, gateway ingestion, real gates or gateway authorization fact writes.

#### Scenario: Sanitized prerequisites allow bounded execution handoff only
- **WHEN** controlled smoke preflight is ready
- **AND** controlled smoke evidence readiness is ready for review
- **AND** controlled smoke release runbook is ready
- **AND** operator remediation handoff is ready or not required
- **AND** remediation result evidence handoff is ready for controlled smoke evidence review
- **AND** all inputs are sanitized summaries with no red-line signal
- **THEN** the handoff SHALL return `status=ready-for-controlled-smoke-execution`
- **AND** the handoff SHALL include evidence package metadata and operator actions for controlled smoke execution preparation only
- **AND** the handoff SHALL NOT describe real publish success, gateway ingestion success, authorization facts success, API/Gateway/Insight success, production readiness, controlled smoke pass or full-success

#### Scenario: Missing prerequisites fail closed
- **WHEN** preflight summary, evidence readiness summary, release runbook summary, operator remediation handoff summary or remediation result evidence handoff summary is missing or not ready
- **THEN** the handoff SHALL return `status=blocked` or `status=needs-user-action`
- **AND** `missingPrerequisites` SHALL include stable prerequisite aliases
- **AND** `blockerAlias` and `remediationAlias` SHALL preserve stable owner-scoped aliases when available
- **AND** operator actions SHALL request only read-only sanitized evidence collection or owner handoff completion

#### Scenario: Hard red-line inputs stop execution handoff
- **WHEN** input summaries or operator notes contain real fixture, DB write, production or production-like operation, real gate, publish, refresh, gateway ingestion, authorization facts, read model rebuild, mapping confirm, secret change or real endpoint execution intent
- **THEN** the handoff SHALL return `status=hard-red-line`
- **AND** `redLineFlags` SHALL include stable aliases such as `real_fixture_signal`, `real_db_write_signal`, `production_like_signal`, `real_gate_signal` or `real_environment_write_signal`
- **AND** the handoff SHALL NOT trigger any real network request, publish, fixture/DB write, gate or authorization fact change

#### Scenario: Sensitive values are never echoed
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway/API response body, full diagnostics response or other credential-like data
- **THEN** the handoff SHALL return `status=blocked` or `status=hard-red-line`
- **AND** it SHALL expose only stable redaction aliases, owner guidance and minimum unblock conditions
- **AND** it SHALL NOT echo the sensitive value or complete response

#### Scenario: Cross-owner success overclaim is blocked
- **WHEN** input claims Gateway allow, API authorization report full-success, Insight success, production readiness, real publish success, gateway ingestion success, authorization facts success, controlled smoke success or full-success
- **THEN** the handoff SHALL return `status=hard-red-line`
- **AND** `cannotInferBoundaries` SHALL state that Admin execution handoff cannot infer API/Gateway/Insight success, production readiness or full-success
- **AND** the handoff SHALL keep owner handoff limits scoped to Admin-owned sanitized evidence and upstream owner summaries

#### Scenario: Unknown aliases remain owner scoped
- **WHEN** sanitized input contains an unrecognized blocker or remediation alias
- **THEN** the handoff SHALL return `status=blocked`
- **AND** `blockerAlias` or `remediationAlias` SHALL include `unknown_controlled_smoke_execution_alias`
- **AND** operator actions SHALL require replacing the unknown value with a stable Admin owner handoff alias before rerunning
- **AND** the handoff SHALL NOT infer API, Insight or Gateway authorization facts
