## ADDED Requirements

### Requirement: Feishu handoff evidence acceptance checklist
The system SHALL include a read-only, redacted acceptance checklist in Feishu/Lark organization sync handoff evidence.

#### Scenario: Build checklist from derived Admin evidence
- **WHEN** an authorized administrator requests handoff evidence for a Feishu/Lark organization
- **THEN** the response includes `acceptanceChecklist` with checklist version, execution mode, manual-review-only marker, summary counts, safe source aliases, checklist items, provider-owned evidence missing aliases, manual review actions, `cannotInfer`, `noFallback`, redaction, and retention metadata
- **AND** checklist items are derived from Admin-owned local metadata such as sync run metadata, dry-run history summaries, binding diagnostics, handoff readiness, safe hashes, aliases, redaction, and retention fields
- **AND** the checklist does not call Feishu/Lark Contact APIs, execute a sync, repair data, update users, update groups, update platform master data, or publish Gateway facts

#### Scenario: Preserve provider-owned and no-fallback boundaries
- **WHEN** checklist evidence requires live tenant credentials, provider payload validation, Gateway projection consumption, Insight acceptance, or production readiness
- **THEN** the checklist marks those facts as `cannot_infer` or provider-owned evidence missing
- **AND** it includes `noFallback` aliases for facts that Admin cannot safely infer from local metadata
- **AND** it does not report provider truth, sync full-success, downstream acceptance, or production readiness as proven

#### Scenario: Return redacted checklist only
- **WHEN** checklist items reference source runs, dry-run histories, source tenant, app, operator context, diagnostics, or binding risks
- **THEN** the response includes only stable hashes, safe markers, aliases, aggregate counts, safe summaries, redaction metadata, and retention metadata
- **AND** the response MUST NOT include phone numbers, emails, real names, complete organization trees, raw source payloads, tokens, Cookie values, private URLs, tenant secrets, raw Feishu/Lark app identifiers, raw tenant keys, raw user identifiers, or raw run/dry-run source identifiers

### Requirement: Feishu handoff evidence acceptance checklist console
The Web Admin Feishu/Lark organization sync page SHALL allow administrators to inspect, copy, and export the redacted acceptance checklist.

#### Scenario: Inspect acceptance checklist
- **WHEN** an administrator opens the Feishu/Lark organization sync page and handoff evidence is available
- **THEN** the page shows a compact acceptance checklist area with execution mode, manual-review-only marker, summary counts, safe source aliases, readiness, provider-owned missing evidence, manual review actions, `cannotInfer`, `noFallback`, redaction, and retention status
- **AND** checklist rows show status, severity, source, safe summary, blocked reason alias, and recommended operator action without raw provider payloads or identity details

#### Scenario: Copy and export sanitized checklist
- **WHEN** an administrator copies or exports the checklist
- **THEN** the page copies or downloads sanitized checklist JSON
- **AND** the page can copy or export sanitized Markdown summarizing the checklist, provider-owned gaps, manual actions, `cannotInfer`, `noFallback`, redaction, and retention metadata
- **AND** the exported content MUST NOT include phone numbers, emails, real names, raw source payloads, tokens, Cookie values, private URLs, tenant secrets, raw Feishu/Lark app identifiers, raw tenant keys, raw user identifiers, or raw run/dry-run source identifiers

#### Scenario: Handle checklist UI states
- **WHEN** checklist evidence is loading, empty, unavailable, provider-owned evidence is missing, `cannotInfer` or `noFallback` items exist, copy/export succeeds, copy/export fails, or handoff evidence refresh fails
- **THEN** the page shows compact loading, empty, provider-missing, cannot-infer, no-fallback, success, or error states
- **AND** these states do not block configuration, connection test, dry-run preview, dry-run history, binding diagnostics, manual sync, formal sync run history, or existing handoff evidence JSON workflows
