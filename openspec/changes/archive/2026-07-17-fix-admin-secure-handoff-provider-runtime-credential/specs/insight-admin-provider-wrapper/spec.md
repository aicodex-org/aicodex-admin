## MODIFIED Requirements

### Requirement: provider 必须统一错误语义和审计日志

系统 MUST 为 Insight Admin Provider 提供稳定 HTTP status、错误码和 AI 可读脱敏审计日志，并支持普通 Provider JWT与已确认的Admin secure-handoff runtime credential。

#### Scenario: provider 参数或权限校验失败

- **WHEN** 请求 token、audience、issuer、scope、用户状态或权限校验失败
- **THEN** 系统 MUST 返回 `UNAUTHENTICATED`、`AUTHORIZATION_FAILED`、`INVALID_ARGUMENT` 或 `PROVIDER_UNAVAILABLE` 中的一个稳定错误码
- **THEN** 系统 MUST 返回可关联的 `traceId`
- **AND** 当 Admin 已保存 enabled `insight_provider_trust` runtime policy 时，audience、issuer 和 scope校验 MUST 使用 saved policy
- **AND** 当 Admin 已保存 disabled `insight_provider_trust` runtime policy 时，Provider MUST fail closed并返回 `AUTHORIZATION_FAILED`
- **AND** saved policy拒绝 token后，Provider MUST NOT 回退 legacy env/config

#### Scenario: provider 调用完成后写入审计日志

- **WHEN** current-user、scope 或 organization-tree Provider处理完成
- **THEN** 系统 MUST 写入结构化审计日志
- **THEN** 日志 MUST 至少包含 `traceId`、`adminUserId`、`organization`、`scopeType`、`groupCount`、`adminUserCount`、`apiUserCount`、`mappingStatus`、`status` 和 `errorCode`

#### Scenario: secure-handoff runtime credential调用Provider

- **WHEN** Insight使用已redeem并confirm、未过期且target/verifier有效的handoff runtime credential请求`current-user`、`current-user/scope`或`current-user/organization-tree`
- **THEN** `AutoSigninFilter` MUST在精确Provider路径执行专用credential验证并把只读身份claims传给Provider controller
- **AND** Provider controller MUST继续使用同一次typed `insight_provider_trust` snapshot校验audience、issuer和required scopes
- **AND** controller MUST加载credential绑定的真实Admin user并执行现有active-user与scope授权逻辑
- **AND** credential MUST NOT创建普通登录session或获得其它Admin API权限

#### Scenario: Provider路径无效Bearer返回稳定HTTP错误

- **WHEN** 三个Provider路径收到格式错误、签名/验证失败、过期、撤销、未confirm或授权不匹配的Bearer
- **THEN** 系统 MUST返回HTTP 401或403，而不是HTTP 200通用filter错误
- **AND** 响应 MUST使用`InsightProviderEnvelope`并包含`UNAUTHENTICATED`或`AUTHORIZATION_FAILED`稳定错误码和可关联trace id
- **AND** filter/controller/audit MUST NOT输出Bearer、credential material、Cookie、完整secretRef、私有URL或底层存储错误文本

#### Scenario: typed trust解析继续fail closed

- **WHEN** handoff credential本身有效但saved `insight_provider_trust`被disabled、配置store不可用、saved policy非法或audience/issuer/scope不匹配
- **THEN** Provider MUST返回HTTP 403和`AUTHORIZATION_FAILED`
- **AND** Provider MUST NOT回退到legacy env/config、普通OAuth lookup或session

#### Scenario: 认证分流保持兼容边界

- **WHEN** Provider路径收到非handoff Bearer
- **THEN** controller MUST继续执行现有JWT signature、Application、subject和typed trust校验
- **AND** `AutoSigninFilter` MUST NOT先把该Bearer作为OAuth database token吞掉
- **WHEN** 非Provider路径收到Bearer
- **THEN** 现有organization sync API key、OAuth access token和session行为 MUST保持不变

#### Scenario: current-user 缺少个人用量映射时返回成功诊断

- **WHEN** 已认证调用人的本地用量映射为`MISSING`，或saved resolver不可用且只能确认`mappingStatus=MISSING`
- **THEN** current-user MUST返回HTTP 200成功envelope和`usageIdentity.mappingStatus=MISSING`
- **AND** current-user MUST NOT猜测或返回`usageIdentity.apiUserId`
- **AND** resolver返回`INVALID`或`AMBIGUOUS`时 MUST继续fail closed
- **AND** typed `insight_provider_trust` saved disabled、store unavailable、invalid policy或认证失败 MUST继续返回`AUTHORIZATION_FAILED`，不得被该诊断语义降级

#### Scenario: handoff credential 使用已验证目标组织

- **WHEN** 内置全局管理员签发的有效handoff credential绑定一个非`built-in` target organization并请求current-user、scope或organization-tree
- **THEN** Provider MUST只从已验证credential auth context取得target organization
- **AND** current-user MUST保留真实签发者身份，但其`organization`、`apiOrganizationId`和组织版本上下文 MUST使用target organization
- **AND** scope与organization-tree MUST在target organization内计算确定范围
- **AND** handoff请求query MUST NOT覆盖credential target organization
- **AND** 普通JWT/session的既有组织解析和全局管理员query行为 MUST保持不变

#### Scenario: target organization 范围不伪造成员映射

- **WHEN** handoff credential target organization的`ALL_COMPANY`或`DEPARTMENT_TREE`范围包含已确认和缺失的成员映射
- **THEN** Provider MUST只在`apiUserIds`中包含该target organization内confirmed正整数映射成员
- **AND** Provider MUST排除缺失成员且不得因创建者属于`built-in`而混入其它组织成员
- **AND** `SELF`或显式`CUSTOM_USERS`必要成员为`MISSING`，以及任何`INVALID`/`AMBIGUOUS`映射 MUST继续fail closed
