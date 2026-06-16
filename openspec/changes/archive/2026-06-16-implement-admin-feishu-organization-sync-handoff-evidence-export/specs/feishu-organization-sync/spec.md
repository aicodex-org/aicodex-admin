## ADDED Requirements

### Requirement: Feishu organization sync handoff evidence
The system SHALL expose a read-only, redacted handoff evidence document for Feishu/Lark organization sync runs and dry-run previews.

#### Scenario: Build handoff evidence from Admin-owned sync metadata
- **WHEN** an authorized administrator requests handoff evidence for a target organization and source type
- **THEN** the system builds the evidence from Admin-owned local sync config, sync run metadata, dry-run history, dry-run diff summaries, and user binding diagnostics
- **AND** the evidence includes `evidenceVersion`, source type, endpoint mode, safe tenant/app/source markers, source id hash, department/user/membership counts, binding conflict summary, soft-disable summary, trigger summary, readiness or blocked reasons, operator next actions, and `cannotInfer`
- **AND** it does not call Feishu/Lark Contact APIs, execute a sync, repair data, update users, update groups, update platform master data, or publish Gateway facts

#### Scenario: Return redacted evidence only
- **WHEN** handoff evidence references a sync run, dry-run history, source tenant, app, binding diagnostic, or operator context
- **THEN** the response includes only stable hashes, safe markers, aggregate counts, reason aliases, safe summaries, and redaction metadata
- **AND** the response MUST NOT include phone numbers, emails, real names, complete organization trees, raw source payloads, tokens, Cookie values, private URLs, tenant secrets, raw Feishu/Lark app identifiers, raw tenant keys, or raw run/dry-run source identifiers

#### Scenario: Report evidence readiness boundaries
- **WHEN** local evidence is missing, unsupported, blocked by failed diagnostics, blocked by binding conflicts, or ready for handoff
- **THEN** the response reports stable readiness states such as `unsupported`, `no_run`, `blocked`, or `ready`
- **AND** it reports `cannotInfer` for facts that require real tenant credentials, live Contact v3 validation, Gateway projection consumption, or Insight acceptance outside Admin-owned local metadata

### Requirement: Feishu handoff evidence export console
The Web Admin Feishu/Lark organization sync page SHALL allow administrators to copy or export redacted handoff evidence JSON.

#### Scenario: Copy or export evidence JSON
- **WHEN** an administrator opens the Feishu/Lark organization sync page
- **THEN** the page shows a handoff evidence area with source type selection, readiness, safe source markers, aggregate counts, binding summary, blocked reasons, operator next actions, `cannotInfer`, and redaction status
- **AND** the administrator can copy or export the evidence JSON without requesting raw Feishu/Lark payloads

#### Scenario: Handle evidence UI states
- **WHEN** evidence is loading, empty, unavailable, unsupported, missing a run, blocked, ready, or fails to refresh
- **THEN** the page shows compact loading, empty, unsupported, no-run, blocked, ready, or error states without blocking configuration, connection test, dry-run preview, dry-run history, binding diagnostics, manual sync, or formal sync run history workflows
