# admin-gateway-organization-projection-publisher Delta

## ADDED Requirements

### Requirement: Admin 必须提供 publish attempt retention cleanup dry-run

Admin SHALL provide an admin-only retention cleanup dry-run for gateway projection publish attempts so operators can review cleanup impact before any destructive action exists.

#### Scenario: Operator generates cleanup dry-run plan
- **WHEN** an authorized Admin operator requests cleanup dry-run for an organization
- **THEN** Admin SHALL return a sanitized plan containing candidate count, blocked count, stable reason aliases, oldest/newest attempt timestamps, retention window, diagnostic completeness, receipt query hint coverage and operator action summary
- **AND** Admin SHALL require `organization` and fail closed when it is missing
- **AND** Admin SHALL support safe filters such as status, failure category, older-than timestamp and limit
- **AND** Admin SHALL NOT delete, update or mutate attempt records

#### Scenario: Cleanup dry-run response is sanitized
- **WHEN** Admin returns cleanup dry-run plan
- **THEN** the response SHALL include only aggregate counts, stable aliases, guardrail state and a bounded sanitized sample
- **AND** the response SHALL NOT include raw Gateway response, token, Cookie, private URL, complete organization tree, complete subject details, phone or email
- **AND** receipt hint coverage SHALL NOT be treated as Gateway receipt success, API authorization success or Insight report success

### Requirement: Admin cleanup execution guardrail 必须 fail closed

Admin SHALL expose cleanup execution guardrails that make destructive cleanup impossible in P0.

#### Scenario: Operator inspects cleanup execution guardrail
- **WHEN** an authorized Admin operator opens cleanup dry-run or calls a cleanup execution guardrail endpoint
- **THEN** Admin SHALL return disabled execution state such as `dryRunOnly=true`, `enabled=false`, `irreversible=false`, `disabledReason` and required confirmation guidance
- **AND** Admin SHALL NOT execute DB delete/update, cleanup real attempts, trigger publish, write Gateway authorization facts or write 60 fixture data

### Requirement: Web admin 必须展示 cleanup dry-run guardrails

Admin web UI SHALL expose retention cleanup dry-run near the publish attempt history console.

#### Scenario: Operator reviews cleanup dry-run in web admin
- **WHEN** operator opens the mapping/projection console for an organization
- **THEN** the UI SHALL display cleanup dry-run candidate/blocked counts, reason aliases, diagnostic completeness, receipt hint coverage, safety checklist and disabled execution guardrail
- **AND** the UI SHALL provide safe filters and refresh behavior without exposing destructive cleanup actions
- **AND** the UI SHALL explain that the dry-run is Admin producer diagnostics only and not downstream authorization evidence
