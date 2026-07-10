## Why

Admin provider 在计算 `ALL_COMPANY` / `DEPARTMENT_TREE` 用量范围时，会因任一非必要成员的 saved resolver 不可用而提前返回 `PROVIDER_UNAVAILABLE`，使 Insight 用量页在账号映射 gate fail-closed。现有聚合范围合同要求跳过缺少确定映射的成员，因此需要修正实现边界，同时保持精确范围严格拒绝。

## What Changes

- 让聚合 queryable scope 在 resolver 对非必要成员返回 `PROVIDER_UNAVAILABLE` 且 `mappingStatus=MISSING` 时，将该成员按缺失映射排除并继续使用已确定映射成员。
- 保持 `SELF` / `CUSTOM_USERS` 必要映射缺失、resolver 不可用以及所有 `INVALID` / `AMBIGUOUS` 映射 fail-closed。
- 增加 focused Go 回归测试，覆盖聚合范围容错和精确范围拒绝边界。
- 记录严格 OpenSpec、自动化测试、覆盖率与可用的 60 脱敏运行态验证证据。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `insight-admin-provider-wrapper`: 明确 queryable scope 对非必要成员 resolver unavailable + missing 的部分成功语义，并保持精确范围 fail-closed。

## Impact

- 代码：`admin/controllers/insight_provider.go`、`admin/controllers/insight_provider_test.go`。
- API：不改变 `/api/admin-provider/insight/v1/current-user/scope` 的响应结构，只修正既有 scope mapping 行为。
- 安全：不猜测 `apiUserId`、不扩大组织或部门权限、不修改 secure handoff package/redeem/confirm。
- 发布：先形成 release candidate 并完成 60 post-fix smoke；获得 `self-closeout=true` 授权后 archive 并 ff-only 合入 `hfl-test-base`，始终不触碰 `test`。
