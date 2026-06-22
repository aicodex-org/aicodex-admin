## ADDED Requirements

### Requirement: 应用接入中心必须生成服务凭据治理交接包

应用接入中心 SHALL provide a scoped service credential governance handoff package action within the existing `/applications` service credential governance area so Admin owners can hand copy-safe Admin-side credential governance evidence to Insight `业务服务接入` or API-Gateway owner flows.

#### Scenario: 管理员生成交接包预览

- **WHEN** a global administrator opens `/applications`
- **AND** the service credential governance config entry has loaded saved or draft groups
- **THEN** the UI SHALL provide a compact handoff package action in the existing service credential governance area
- **AND** activating it SHALL render schema/version, source, generatedAt, target consumer alias, Admin owner alias and group-level readiness/status preview
- **AND** it SHALL NOT create a new top-level center, generic configuration center, route or menu item

#### Scenario: 交接包使用保存回读后的 copy-safe 配置

- **WHEN** a global administrator saves service credential governance config successfully
- **AND** the response returns sanitized readback groups
- **THEN** generating the handoff package SHALL use the sanitized readback groups currently rendered by the UI
- **AND** it MAY include copy-safe status and diagnostic aliases as summary inputs
- **AND** it SHALL NOT echo stale unsaved values when server readback has replaced the draft

#### Scenario: 交接包预览保持脱敏

- **WHEN** the handoff package is generated or previewed
- **THEN** the UI SHALL render only safe schema/version, aliases, owner hints, source class, credential reference summary, caller policy presence/alias, bounded runtime policy summary, keep-in-env, cannot-infer and next-action fields
- **AND** it MUST NOT render token values, Authorization headers, Cookies, DSNs, client secrets, private keys, complete private URLs, raw provider responses, raw downstream responses, raw ids, real accounts or complete organization trees

#### Scenario: 交接包错误态不影响应用接入操作

- **WHEN** the handoff package cannot be generated because governance config is loading, empty or unavailable
- **THEN** the UI SHALL show a compact unavailable state for the handoff package action
- **AND** Application list, add, edit, copy, delete, Provider, API mapping, audit links, config save action and diagnostic action SHALL remain available
