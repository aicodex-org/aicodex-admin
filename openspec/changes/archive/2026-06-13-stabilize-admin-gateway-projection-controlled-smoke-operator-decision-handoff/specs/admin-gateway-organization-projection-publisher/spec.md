## ADDED Requirements

### Requirement: Admin controlled smoke operator decision handoff 必须 fail closed

系统 SHALL 提供 Admin-owned 本地 controlled smoke operator decision handoff，用脱敏的 operator triage handoff summary、result evidence handoff summary、controlled smoke execution handoff summary、release summary handoff summary、operator note 和 operator metadata 生成 operator decision package。该 handoff SHALL NOT 触发真实 publish、真实 controlled smoke、Gateway ingestion、endpoint/provider token、fixture/DB 写入、mapping confirm、gate 或 authorization fact 变更。

#### Scenario: Sanitized handoff summaries allow operator decision handoff
- **WHEN** operator triage handoff summary 已是 `ready-for-operator-triage-handoff`
- **AND** result evidence handoff summary 已是 `ready-for-result-evidence-handoff`
- **AND** controlled smoke execution handoff summary 已是 `ready-for-controlled-smoke-execution`
- **AND** release summary handoff summary 已是 `ready-for-release-summary-handoff`
- **AND** 输入只包含脱敏 status、stable alias、counts、owner handoff limits、risk/redaction 分类和不能外推边界
- **THEN** the handoff SHALL return `status=ready-for-operator-decision-handoff`
- **AND** it SHALL include `nextAdminAction`、`nextSteps`、`ownerHandoffLimits`、`minimumUnblockConditions`、`decisionPackageMetadata`、`doNotDispatchUntil` and `cannotInferBoundaries`
- **AND** `cannotInferBoundaries` SHALL state that this decision package does not prove real publish, real controlled smoke, Gateway ingestion, API/Gateway/Insight success, authorization facts, production readiness, controlled smoke pass or full-success

#### Scenario: Blocked upstream handoff remains blocked
- **WHEN** operator triage, result evidence, execution or release summary handoff summary is missing, blocked, failed, partial or unknown
- **THEN** the handoff SHALL return `status=blocked`
- **AND** it SHALL preserve stable upstream `blockerAlias`, `remediationAlias`, owner handoff and minimum unblock condition when available
- **AND** it SHALL request only read-only sanitized evidence collection or Admin owner remediation

#### Scenario: Needs user action is preserved for operator decision
- **WHEN** any input handoff summary or aliases indicate `needs-user-action`
- **THEN** the handoff SHALL return `status=needs-user-action`
- **AND** it SHALL preserve stable `blockerAlias`, `remediationAlias`, owner handoff and minimum unblock condition
- **AND** it SHALL NOT downgrade the state to ready or claim controlled smoke success

#### Scenario: Hard red-line inputs stop operator decision
- **WHEN** input summaries, operator note or metadata contain real publish, real controlled smoke, Gateway ingestion, authorization facts, fixture/DB, production-like endpoint, real gate, mapping confirm, read model rebuild, credential-like data or full-success/API/Gateway/Insight success claims
- **THEN** the handoff SHALL return `status=hard-red-line`
- **AND** `redLineFlags` SHALL include stable aliases such as `real_publish_signal`, `real_controlled_smoke_signal`, `gateway_ingestion_signal`, `authorization_facts_signal`, `real_fixture_signal`, `real_db_write_signal`, `production_like_signal` or `full_success_overclaim`
- **AND** the handoff SHALL NOT trigger any real network request, publish, fixture/DB write, gate or authorization fact change

#### Scenario: Sensitive values are never echoed
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway/API response body, full diagnostics response or other credential-like data
- **THEN** the handoff SHALL return `status=blocked` or `status=hard-red-line`
- **AND** it SHALL expose only stable redaction aliases, owner guidance and minimum unblock conditions
- **AND** it SHALL NOT echo the sensitive value or complete response

#### Scenario: Unknown decision aliases remain owner scoped
- **WHEN** sanitized input contains an unrecognized triage, result evidence, execution, release summary, blocker or remediation alias
- **THEN** the handoff SHALL keep the result blocked
- **AND** owner SHALL be `admin_operator`
- **AND** minimum unblock conditions SHALL require replacing the unknown alias with a stable Admin owner handoff alias
- **AND** the handoff SHALL NOT infer API, Insight or Gateway authorization facts
