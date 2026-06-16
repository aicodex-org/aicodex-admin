## ADDED Requirements

### Requirement: Admin controlled smoke operator readiness handoff 必须 fail closed

系统 SHALL 提供 Admin-owned 本地 controlled smoke operator readiness handoff，用脱敏的 operator action handoff summary、operator note 和 operator metadata 生成可交接的 readiness package。该 handoff SHALL NOT 触发真实 publish、真实 controlled smoke、Gateway ingestion、endpoint/provider token、fixture/DB 写入、mapping confirm、read model rebuild、gate 或 authorization fact 变更。

#### Scenario: Sanitized action package allows operator readiness handoff
- **WHEN** operator action handoff summary 已是 `ready-for-operator-action`
- **AND** 输入只包含脱敏 status、stable alias、counts、owner handoff limits、risk/redaction 分类、evidence references 和不能外推边界
- **THEN** the handoff SHALL return `readinessStatus=ready-for-operator-readiness-handoff`
- **AND** it SHALL include `readyChecks`、`blockedAlias`、`minimumUnblockConditions`、`doNotDispatchUntil`、`ownerSafeNextActions`、`evidenceReferences`、`cannotInfer` and `cannotInferBoundaries`
- **AND** `cannotInfer` and `cannotInferBoundaries` SHALL state that this readiness package does not prove real publish, real controlled smoke, Gateway ingestion, API/Gateway/Insight success, authorization facts, production readiness, controlled smoke pass or full-success

#### Scenario: Blocked action package remains blocked
- **WHEN** operator action handoff summary is missing, blocked, failed, partial or unknown
- **THEN** the handoff SHALL return `readinessStatus=blocked`
- **AND** it SHALL preserve stable upstream `blockerAlias`, `remediationAlias`, owner handoff and minimum unblock condition when available
- **AND** it SHALL request only read-only sanitized action package collection or Admin owner remediation

#### Scenario: Needs user action is preserved for operator readiness
- **WHEN** operator action handoff summary or aliases indicate `needs-user-action`
- **THEN** the handoff SHALL return `readinessStatus=needs-user-action`
- **AND** it SHALL preserve stable `blockedAlias`, `remediationAlias`, owner handoff and minimum unblock condition
- **AND** it SHALL NOT downgrade the state to ready or claim controlled smoke success

#### Scenario: Hard red-line inputs stop operator readiness
- **WHEN** input summaries, operator note or metadata contain real publish, real controlled smoke, Gateway ingestion, authorization facts, fixture/DB, production-like endpoint, real gate, mapping confirm, read model rebuild, credential-like data or full-success/API/Gateway/Insight success claims
- **THEN** the handoff SHALL return `readinessStatus=hard-red-line`
- **AND** `redLineFlags` SHALL include stable aliases such as `real_publish_signal`, `real_controlled_smoke_signal`, `gateway_ingestion_signal`, `authorization_facts_signal`, `real_fixture_signal`, `real_db_write_signal`, `production_like_signal`, `mapping_confirm_signal`, `read_model_rebuild_signal` or `full_success_overclaim`
- **AND** the handoff SHALL NOT trigger any real network request, publish, fixture/DB write, mapping confirm, read model rebuild, gate or authorization fact change

#### Scenario: Sensitive values are never echoed
- **WHEN** input contains token, Cookie, private endpoint, real account, phone, email, complete organization tree, complete organizationId, source tenant metadata, configRef, secretRef, raw gateway/API response body, full diagnostics response or other credential-like data
- **THEN** the handoff SHALL return `readinessStatus=blocked` or `readinessStatus=hard-red-line`
- **AND** it SHALL expose only stable redaction aliases, owner guidance, sanitized evidence references and minimum unblock conditions
- **AND** it SHALL NOT echo the sensitive value or complete response

#### Scenario: Unknown readiness aliases remain owner scoped
- **WHEN** sanitized input contains an unrecognized action, blocker or remediation alias
- **THEN** the handoff SHALL keep the result blocked
- **AND** owner SHALL be `admin_operator`
- **AND** minimum unblock conditions SHALL require replacing the unknown alias with a stable Admin owner handoff alias
- **AND** the handoff SHALL NOT infer API, Insight or Gateway authorization facts
