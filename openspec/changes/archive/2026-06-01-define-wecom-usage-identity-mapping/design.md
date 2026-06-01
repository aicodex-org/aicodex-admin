## Context

当前 Insight 登录链路已经可以通过 aicodex-admin OIDC 和企业微信扫码识别同步用户，admin 侧也已经具备企业微信组织同步数据：用户映射、部门映射、成员关系、部门负责人和直接上级关系。但 Insight admin provider 在计算用量 scope 时仍主要读取用户 `Properties` 中的 `aicodexApiUserId` / `apiUserId`，无法把企业微信同步用户自动映射到 aicodex-api 的内部用量用户 ID。

三个系统的职责边界需要保持清晰：

```text
aicodex-admin   组织身份权威：企业微信组织、部门、成员、负责人、Insight scope
aicodex-api     用量身份权威：API 用户、OAuth/企业微信绑定、usage provider 聚合
aicodex-insight 展示层：只消费 admin scope 和 api usage provider，不直连数据库
```

这次变更只建立 admin 到 api 的只读身份解析链路，不把组织同步逻辑复制到 api，也不让 Insight 参与映射。

## Goals / Non-Goals

**Goals:**

- 让企业微信同步用户在完成 api 侧登录/绑定后，可以通过稳定身份自动解析出 `apiUserId`。
- 让部门负责人 scope 可以批量解析部门成员的用量用户 ID，支撑部门用量报表。
- 保留手工 `aicodexApiUserId` 作为兼容兜底，避免破坏已有配置。
- 对缺失、歧义、非法和服务不可用给出确定性状态、错误码和审计日志。
- 防止跨服务 N+1，scope 计算中一次性批量解析所有待映射用户。

**Non-Goals:**

- 不在 admin 中创建、修改或删除 aicodex-api 用户。
- 不让 api 直接同步企业微信组织架构。
- 不基于姓名、邮箱、手机号、展示名等弱标识自动匹配用户。
- 不改变 Insight 已有报表聚合接口和导出能力。
- 不在本变更中实现部门/员工模型权限策略。

## Decisions

### 1. admin 负责授权范围，api 负责用量身份解析

admin provider 继续根据当前 admin 用户、企业微信部门关系和负责人关系计算可见 scope；api resolver 只回答“这些稳定外部身份分别对应哪些 api 用户 ID”。这样避免 api 复制组织授权规则，也避免 Insight 直连任一业务数据库。

备选方案是 admin 直接查 api 数据库。该方案短期简单，但会破坏服务边界、增加数据库耦合，也不利于后续 api 侧调整登录绑定模型，不采用。

### 2. 解析请求使用稳定身份集合，而不是单一字段

admin 对每个待解析用户构造一个 identity item，至少包含：

- `adminUserId`：admin 稳定用户 ID，例如 `organization/name`。
- `wecomExternalId`：企业微信稳定外部身份，例如 `wecom:{corpId}:{userid}`。
- `wecomCorpId` 和 `wecomUserId`：结构化企业微信身份，便于 api 校验和日志脱敏。

api 后续可能通过两类受信身份形成绑定：

- 用户从 api 侧通过 aicodex-admin OIDC 登录，api OAuth binding 的 provider user id 可能是 admin OIDC `sub`。
- 用户通过企业级 SSO/UniIAM 或后续明确登录绑定流程登录 api，且受信 IdP 显式返回企业微信稳定身份时，api 可能保存 `wecom:{corpId}:{userid}` 作为辅助外部身份。

admin 同时传递这些稳定标识，可以兼容当前 admin OIDC 主路径和后续受信企业身份扩展。api 必须按精确绑定解析，不得退化为邮箱或姓名匹配。

### 3. 映射优先级保持兼容

单个用户映射按以下顺序处理：

1. 若 admin 用户存在明确手工 `aicodexApiUserId` / `aicodex_api_user_id` / `apiUserId`，先校验其为正整数文本并直接使用。
2. 若无手工映射且用户存在企业微信稳定身份，则加入本次批量 resolver 请求。
3. 若无任何可解析稳定身份，返回 `MISSING`。

手工映射作为兼容兜底，不要求 api resolver 再确认；后续如果需要发现手工映射陈旧，可单独增加诊断任务或管理页提示。

### 4. scope 内批量解析并按用户回填

current-user 只解析当前用户；scope 先收集当前 scope 内所有候选 admin 用户，去重后批量调用 api resolver，再把结果回填到：

- 顶层 `apiUserIds`
- `departments[].apiUserIds`
- `usageIdentity`
- `mappingStatus`

同一次 provider 请求内维护内存级解析结果缓存，避免部门重叠时重复解析同一个用户。暂不做跨请求缓存，避免登录绑定刚建立后出现陈旧结果。

### 5. 错误语义保持确定性

- 输入身份格式非法：返回 `INVALID`，scope provider 对必要用户返回 `AUTHORIZATION_FAILED`。
- api resolver 明确未命中：返回 `MISSING`；部门/全公司聚合可跳过缺失成员继续返回已映射成员，self/custom users 这类精确 scope 必须拒绝。
- api resolver 返回多个候选或重复绑定：返回 `AMBIGUOUS`。
- api resolver 不可用、超时或返回协议错误：返回 `PROVIDER_UNAVAILABLE`，不得降级为 `EMPTY`。

部门/全公司 scope 内如果只有部分成员缺少映射，admin provider 默认跳过缺失成员，只把已完成用量身份映射的成员下发给 Insight。这样适配企业微信组织先同步、api 登录绑定逐步补齐的现实状态，避免一个未使用过 api 的成员阻断负责人查看部门已发生的用量。self scope 和 custom users scope 仍是精确授权范围，缺失、歧义或非法映射必须拒绝。

### 6. AI 可读日志

admin provider 在 current-user 和 scope 完成时记录 provider 审计日志，并在调用 api resolver 时记录 resolver-client 审计日志；两类日志必须通过同一个 `traceId` 关联，避免单条日志承载过多身份细节。

provider 审计日志至少包含：

- `traceId`
- `adminUserId`
- `organization`
- `scopeType`
- `groupCount`
- `adminUserCount`
- `apiUserCount`
- `mappingStatus`
- `status`
- `errorCode`

resolver-client 审计日志至少包含：

- `traceId`
- `resolverCaller`
- `resolverBatchSize`
- `resolverOkCount`
- `resolverMissingCount`
- `resolverAmbiguousCount`
- `resolverInvalidCount`
- `status`
- `errorCode`
- `durationMs`

日志不得输出手机号、邮箱、access token、refresh token、client secret 或完整 resolver 凭据。

## Risks / Trade-offs

- [api resolver 尚未部署] -> admin 通过配置开关或空 endpoint 保持手工映射路径；部署顺序要求先上 api resolver，再启用 admin 调用。
- [企业微信同步身份与 api 登录绑定口径不一致] -> resolver 请求同时携带 admin subject 和 WeCom external id，api 侧按已支持的稳定绑定精确解析。
- [部门成员很多导致 resolver 请求过大] -> admin 按配置拆分批次，api 侧也设置批量上限；超限返回 `INVALID_ARGUMENT`。
- [部分成员缺失映射导致部门数据不完整] -> 部门/全公司 scope 先返回已映射成员的数据，并通过审计日志记录 missing 数量；后续可单独增加缺失清单或映射诊断页。
- [手工映射可能陈旧] -> 本变更保持兼容，不主动覆盖；后续可增加诊断页或后台批量校验任务。

## Migration Plan

1. 先部署 api 的 `wecom-usage-identity-resolver`，并验证服务间鉴权、批量解析和日志。
2. admin 新增 resolver 配置，但默认可保持未启用；未启用时继续使用手工映射。
3. 在测试环境启用 admin -> api resolver，使用企业微信同步用户完成 api 登录绑定后验证 Insight scope。
4. 若出现问题，关闭 admin resolver 配置即可回退到手工映射路径，不需要回滚数据库。

## Open Questions

- api 侧已通过独立 `AICODEX_USAGE_IDENTITY_PROVIDER_TOKENS_JSON` 或 `INSIGHT_USAGE_IDENTITY_PROVIDER_*` 配置 provider ids/slugs；admin 侧只需配置 resolver endpoint/token/caller。
- scope 是否允许缺失部分成员映射时返回部分报表，需要产品侧进一步确认。
- 是否需要后台管理页展示“企业微信用户 -> api 用户”的映射诊断结果，建议后续单独提案。
