## ADDED Requirements

### Requirement: WeCom source release decision guardrail
The system SHALL provide an Admin-owned, read-only WeCom source release decision guardrail that consumes sanitized WeCom source readiness handoff evidence and produces the minimum operator-facing release decision for later organization tree read-only readiness or controlled smoke preparation.

#### Scenario: Produce ready decision from sanitized source readiness handoff
- **WHEN** the release decision guardrail receives a sanitized source readiness handoff with `wecom_source_ready`
- **THEN** the output MUST include `decision=ready_for_org_tree_readiness`, `reasonAlias=wecom_source_ready`, `safeNextSteps`, `minimumUnblockConditions`, and `doNotProceedReasons`
- **AND** `release=release_after_report` MUST only permit later owner read-only readiness or controlled smoke preparation

#### Scenario: Preserve blocking source readiness aliases
- **WHEN** the release decision guardrail receives `wecom_config_missing`, `wecom_config_disabled`, `wecom_credential_not_verified`, `wecom_latest_run_failed`, `wecom_no_recent_success`, `wecom_run_active`, or `sanitization_failed`
- **THEN** the output MUST keep `decision=blocked` and preserve the stable alias as `reasonAlias`
- **AND** it MUST expose owner handoff and minimum unblock conditions without triggering manual sync, creating sync runs, writing fixtures, querying real databases, or reading API, Insight, or Gateway data

#### Scenario: Fail closed on sensitive or downstream evidence
- **WHEN** the release decision input contains unmasked secrets, tokens, cookies, private URLs, account identifiers, phone numbers, emails, full organization trees, full organization IDs, source tenant metadata, raw response bodies, real fixture/DB details, or Gateway/API/Insight/full-success assertions
- **THEN** the output MUST return `decision=blocked` with `reasonAlias=sanitization_failed`
- **AND** it MUST NOT echo the sensitive or downstream values

#### Scenario: Do not overstate downstream success
- **WHEN** the release decision returns `ready_for_org_tree_readiness`
- **THEN** operators MUST NOT record it as proof that the organization tree is non-empty, Gateway projection is publishable, authorization facts are active, API or Insight success exists, real fixtures are ready, real database state is valid, or the system is full-success
