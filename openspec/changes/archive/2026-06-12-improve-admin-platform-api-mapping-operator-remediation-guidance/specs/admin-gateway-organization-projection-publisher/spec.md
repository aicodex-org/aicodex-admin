## ADDED Requirements

### Requirement: Platform API mapping readiness 必须返回 operator remediation guidance
Admin SHALL include read-only operator remediation guidance in `PlatformApiUserMapping` readiness diagnostics so operators can map each readiness category to safe next actions without querying API/Insight databases, writing mappings, or creating gateway authorization facts.

#### Scenario: Readiness response includes category guidance
- **WHEN** operator requests `/api/get-platform-api-user-mapping-readiness` for an Admin organization
- **THEN** Admin SHALL return remediation guidance for `active_publishable`, `tombstone_publishable`, `mapping_missing`, `mapping_untrusted`, `lifecycle_not_publishable`, `source_metadata_unavailable` and `lineage_freshness_unavailable`
- **AND** each guidance item SHALL include a stable code, summary, operator action list, minimum unblock condition and owner-boundary warning
- **AND** the endpoint SHALL NOT create, update or confirm `PlatformApiUserMapping`

#### Scenario: Guidance distinguishes missing and untrusted mappings
- **WHEN** readiness counts include `mapping_missing` or `mapping_untrusted`
- **THEN** guidance SHALL explain that `mapping_missing` requires a same `organizationId + adminSubject` first-class `PlatformApiUserMapping.ApiUserId`
- **AND** guidance SHALL explain that `mapping_untrusted` requires confirmed platform user and API mapping statuses before the subject can become active publishable
- **AND** guidance SHALL NOT suggest using display name, phone, email, legacy lineage or user properties as runtime projection join keys

#### Scenario: Guidance preserves source and freshness boundaries
- **WHEN** readiness counts include `source_metadata_unavailable` or `lineage_freshness_unavailable`
- **THEN** guidance SHALL direct operators to Admin-owned source snapshot, org version, batch and freshness metadata checks
- **AND** guidance SHALL NOT instruct operators to query API/Insight/gateway stores or infer authorization facts from Admin diagnostics

#### Scenario: UI and runbook expose guidance safely
- **WHEN** operator views the Platform API mapping page or Bruno readiness runbook
- **THEN** the UI or runbook SHALL surface category remediation steps and minimum unblock conditions
- **AND** they SHALL state that `subjectCount=0 + mapping_missing` is fixture readiness missing, not full projection business success
- **AND** verification records SHALL use counts, category, stable code and alias rather than token, Cookie, real account, phone, email, complete organization tree, complete organizationId or full response body
