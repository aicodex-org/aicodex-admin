## MODIFIED Requirements

### Requirement: provider 必须统一错误语义和审计日志

系统 MUST 为 insight admin provider 提供稳定错误码和 AI 可读审计日志，便于跨服务联调、排障和权限复盘。

#### Scenario: provider 参数或权限校验失败
- **WHEN** 请求 token、audience、issuer、scope、用户状态或权限校验失败
- **THEN** 系统 MUST 返回 `UNAUTHENTICATED`、`AUTHORIZATION_FAILED`、`INVALID_ARGUMENT` 或 `PROVIDER_UNAVAILABLE` 中的一个稳定错误码
- **THEN** 系统 MUST 返回可关联的 `traceId`
- **AND** 当 Admin 已保存 enabled `insight_provider_trust` runtime policy 时，audience、issuer 和 scope 校验 MUST 使用 saved policy
- **AND** 当 Admin 已保存 disabled `insight_provider_trust` runtime policy 时，provider MUST fail closed and return `AUTHORIZATION_FAILED`
- **AND** provider MUST NOT fall back to legacy env/config after a saved policy rejects the token

#### Scenario: provider 调用完成后写入审计日志
- **WHEN** current-user、scope 或 organization-tree provider 处理完成
- **THEN** 系统 MUST 写入结构化审计日志
- **THEN** 日志 MUST 至少包含 `traceId`、`adminUserId`、`organization`、`scopeType`、`groupCount`、`adminUserCount`、`apiUserCount`、`mappingStatus`、`status` 和 `errorCode`
