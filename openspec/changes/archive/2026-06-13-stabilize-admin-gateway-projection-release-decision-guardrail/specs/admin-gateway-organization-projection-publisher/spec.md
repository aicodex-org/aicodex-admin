## ADDED Requirements

### Requirement: Gateway projection release decision guardrail MUST classify local evidence safely
Admin SHALL provide a local, read-only release decision guardrail for gateway projection operator handoff. The guardrail SHALL classify sanitized projection preflight/readiness evidence into stable decisions: `ready-for-controlled-smoke`, `blocked-by-source-freshness`, `blocked-by-mapping-readiness`, `blocked-by-contract-or-config`, or `not-checked`.

#### Scenario: Controlled smoke readiness is explicitly bounded
- **WHEN** observability preflight and readiness summary provide sanitized evidence with no blocking alias
- **AND** mapping readiness has been checked and is not blocked
- **THEN** the release decision SHALL be `ready-for-controlled-smoke`
- **AND** the decision SHALL state that local preflight/readiness evidence is not real publish success, gateway ingestion success, authorization fact success, or full projection business success

#### Scenario: Source freshness blockers map to source decision
- **WHEN** readiness evidence contains source freshness aliases such as `source_connection_stale`
- **THEN** the release decision SHALL be `blocked-by-source-freshness`
- **AND** the handoff SHALL direct operators to Admin-owned source/freshness checks rather than API/Insight/gateway stores

#### Scenario: Mapping blockers map to mapping decision
- **WHEN** readiness evidence contains `mapping_missing`, `mapping_untrusted`, `source_metadata_unavailable`, `lineage_freshness_unavailable`, or `lifecycle_not_publishable`
- **THEN** the release decision SHALL be `blocked-by-mapping-readiness`
- **AND** the handoff SHALL require first-class Admin mapping/source readiness conditions without using display name, phone, email, legacy lineage, or user properties as runtime join keys

#### Scenario: Contract, config and sanitization blockers fail closed
- **WHEN** evidence contains stale deployment shape, missing latest audit when required, subject fixture gate failure, unavailable response, unknown alias, or sensitive fields/values
- **THEN** the release decision SHALL be `blocked-by-contract-or-config`
- **AND** the decision SHALL expose only sanitized aliases, reasons, owners and minimum unblock conditions

#### Scenario: Missing required evidence remains not checked
- **WHEN** operator has not provided required readiness evidence such as mapping readiness
- **THEN** the release decision SHALL be `not-checked`
- **AND** the decision SHALL provide the next read-only action without querying real databases, writing fixtures, publishing projection, or creating gateway authorization facts
