## ADDED Requirements

### Requirement: WeCom source readiness handoff
The system SHALL provide an Admin-owned, read-only WeCom source readiness handoff that lets an operator classify whether the WeCom organization sync source has the minimum readiness evidence needed before organization tree or projection follow-up work.

#### Scenario: Produce sanitized source readiness handoff
- **WHEN** an operator runs the WeCom source readiness handoff with sanitized config and runs evidence
- **THEN** the handoff output MUST only include `status`, `aliases`, `ownerHandoffs`, `minimumUnblockConditions`, `safeNextActions`, and `evidenceShapeVersion`
- **AND** it MUST classify evidence using stable aliases including `wecom_config_missing`, `wecom_config_disabled`, `wecom_credential_not_verified`, `wecom_latest_run_failed`, `wecom_no_recent_success`, `wecom_run_active`, and `wecom_source_ready`

#### Scenario: Keep handoff read-only
- **WHEN** the source readiness handoff runs
- **THEN** it MUST NOT trigger manual sync, create a sync run, update sync configuration, write fixtures, query or write a real database directly, or read API, Insight, or Gateway data
- **AND** it MUST rely only on Admin-owned read-only WeCom config/runs evidence and optional sanitized credential-verification summary

#### Scenario: Fail closed on sensitive evidence
- **WHEN** the handoff input contains unmasked secrets, tokens, cookies, private URLs, account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, or raw response bodies
- **THEN** the handoff MUST return a blocked sanitization alias without echoing the sensitive values

#### Scenario: Do not overstate downstream readiness
- **WHEN** the handoff returns `wecom_source_ready`
- **THEN** operators MUST treat it only as Admin WeCom source readiness evidence
- **AND** they MUST NOT record it as proof of non-empty organization tree readiness, Gateway projection readiness, authorization report readiness, controlled smoke success, or full-success
