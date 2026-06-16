## ADDED Requirements

### Requirement: Gateway projection controlled smoke release runbook MUST summarize sanitized release evidence
Admin SHALL provide a local, read-only controlled smoke release runbook for gateway projection operator coordination. The runbook SHALL consume only sanitized evidence and handoff summaries, a release decision alias and a controlled smoke preflight alias, and SHALL return stable status, reason, operator next actions, missing prerequisites, hard red-line flags and redacted evidence hints without triggering publish, refresh, fixture writes, database mutations, API/Insight queries, gateway ingestion or gateway authorization fact writes.

#### Scenario: Runbook permits only controlled smoke preparation when evidence is ready
- **WHEN** the release decision alias is `ready-for-controlled-smoke`
- **AND** the controlled smoke preflight alias is `ready-for-controlled-smoke-prep`
- **AND** sanitized evidence summaries are present and contain no hard red-line signal
- **THEN** the runbook SHALL return `status=ready`
- **AND** the runbook SHALL include operator next actions for controlled smoke preparation only
- **AND** the runbook SHALL state that it is not real publish success, gateway ingestion success, authorization facts success or full projection business success

#### Scenario: Missing prerequisites fail closed
- **WHEN** the operator omits the release decision alias, preflight alias or required sanitized evidence summary
- **THEN** the runbook SHALL return `status=blocked`
- **AND** the runbook SHALL include stable missing prerequisite aliases and read-only next actions to collect sanitized release/preflight evidence
- **AND** the runbook SHALL NOT query real databases, write fixtures, publish projection, refresh projection, call API/Insight/Gateway stores or create gateway authorization facts

#### Scenario: Hard red-line signals block release runbook
- **WHEN** input evidence or operator notes contain real environment write signals, publish/ingestion/write/read-model rebuild/full-success intent, sensitive fields or complete responses
- **THEN** the runbook SHALL return `status=blocked`
- **AND** the runbook SHALL expose hard red-line flags using stable aliases such as `real_environment_write_signal`, `full_success_overclaim` or `sanitization_failed`
- **AND** the runbook SHALL NOT echo token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway response body or full API diagnostics response

#### Scenario: Blocking release or preflight aliases remain owner-scoped
- **WHEN** release decision or controlled smoke preflight evidence contains a blocked, hold, not-checked or unknown alias
- **THEN** the runbook SHALL return `status=blocked`
- **AND** the runbook SHALL preserve owner handoff and minimum unblock condition when available
- **AND** the runbook SHALL NOT ask API, Insight or Gateway owners to compute Admin projection locally or infer authorization facts from Admin diagnostics

#### Scenario: Redacted evidence hints are bounded
- **WHEN** the runbook includes evidence hints for audit
- **THEN** hints SHALL include only source alias, status, decision, stable alias, owner and minimum unblock condition
- **AND** hints SHALL NOT include raw evidence payloads, full response bodies, private URLs, credentials, real accounts or full organization identifiers
