## Context

`mapInsightUsersToUsageIdsWithPolicyAndCache` 已通过 `skipMissing` 区分聚合 queryable scope 与精确 scope，但它在逐用户应用该策略前先调用严格的 `preloadInsightUsageIdentityCache`。当 saved resolver policy 已配置而 resolver 不可用时，preload 会直接返回 `PROVIDER_UNAVAILABLE` / `MISSING`，导致 `ALL_COMPANY` / `DEPARTMENT_TREE` 没有机会跳过非必要缺失成员。

60 同一登录会话已确认当前用户 `usageIdentity.mappingStatus=OK` 且组织 mapping confirmed，但 scope 返回 `PROVIDER_UNAVAILABLE` / `MISSING`；同组织 readiness 中只有少量 confirmed mapping，大量成员为 `mapping_missing`。因此问题位于聚合范围的 preload 策略边界，不是当前用户配置缺口，也没有 secure handoff 直接证据。

## Goals / Non-Goals

**Goals:**

- queryable scope 在 resolver 对非必要成员返回 unavailable+missing 时继续返回已确定映射成员。
- 保持 `SELF` / `CUSTOM_USERS`、`INVALID` / `AMBIGUOUS`、生命周期冲突与权限边界 fail-closed。
- 保持批量 resolver、缓存复用、API 响应结构和审计语义不变。

**Non-Goals:**

- 不补算或猜测 `apiUserId`，不自动创建/确认 mapping。
- 不放宽组织、部门、生命周期或角色授权。
- 不修改 secure handoff package/redeem/confirm、resolver 凭据治理或 Insight consumer。
- 实现阶段不自动部署 60；archive 和合入 `hfl-test-base` 仅在 60 post-fix smoke 通过并获得 `self-closeout=true` 授权后执行，始终不触碰 `test`。

## Decisions

### 1. 在 identity preload 边界显式传入 queryable 策略

新增 policy-aware preload 内部函数；现有严格 wrapper 保持原语义。`mapInsightUsersToUsageIdsWithPolicyAndCache` 把 `skipMissing` 传给 policy-aware preload。只有当 resolver 错误同时满足 `Code=PROVIDER_UNAVAILABLE` 和 `MappingStatus=MISSING` 时，queryable 模式才把仍未缓存的 pending 用户记为 `MISSING` 并继续；随后既有逐用户逻辑排除这些成员。

选择该方案是因为容错发生在错误产生的最小边界，`ALL_COMPANY` / `DEPARTMENT_TREE` 共用且无需在各 builder 重复捕获。直接在 builder 吞错会复制规则并可能误吞 `INVALID` / `AMBIGUOUS`；要求 operator 为全部成员补 mapping 或恢复 resolver 只能作为环境治理，不能修复与既有聚合合同不符的行为。

### 2. 精确范围和不确定映射保持严格失败

`SELF` / `CUSTOM_USERS` 继续通过 `skipMissing=false` 调用严格 preload。resolver 返回 `INVALID` / `AMBIGUOUS`，或错误不是 unavailable+missing 时，不转换为可跳过成员。这样只减少错误拒绝，不增加任何可查询主体。

### 3. 用行为测试证明边界

先增加 saved resolver unavailable + 部分成员缺失的聚合 scope 回归测试并确认 RED；再增加或复用精确 scope fail-closed 断言。测试直接调用 scope 计算路径，使用现有 runtime policy test fixture，不 mock builder 结果。

## Risks / Trade-offs

- [Risk] resolver 整体不可用时 queryable scope 可能只返回本地 confirmed 成员，数据不完整。→ `apiUserIds` 只包含确定映射，`mappingStatus=OK` 表示返回集合确定而非组织全员完成；readiness 继续暴露缺失计数。
- [Risk] 误把歧义或非法映射当缺失跳过。→ 仅匹配 `PROVIDER_UNAVAILABLE + MISSING`，测试覆盖 `SELF` / `CUSTOM_USERS` 严格分支，既有 invalid/ambiguous 测试继续运行。
- [Risk] 本地测试不能替代运行态验收。→ RC 部署后已在 60 使用真实 Insight OIDC 登录态验证 Admin provider 与用量查询路径；验证记录仍区分 provider/API smoke 与非零用量展示。
