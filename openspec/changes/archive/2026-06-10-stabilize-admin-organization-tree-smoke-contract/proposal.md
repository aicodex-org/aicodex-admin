## Why

60 测试环境部署健康已通过，但 admin organization-tree 最小 smoke 发现：`GET /api/admin-provider/insight/v1/current-user/organization-tree` 返回 HTTP 200 且 `status=ok` 时，`data.nodes[]` / `data.list[]` 为空，并且 smoke 未确认到 `orgVersion` 或 `scopeVersion`；`freshness` 存在。

上一轮 `stabilize-admin-organization-tree-read-model` 已经建立组织树 read model 的长期契约。本 change 不扩大范围，只收敛 smoke 合同暴露的验收缺口：成功 envelope 必须稳定可诊断，业务空树和不可信 read model 必须可区分。

## What Changes

- 确认 organization-tree 成功响应的版本字段路径：`orgVersion` 和 `scopeVersion` 位于 `InsightProviderEnvelope.data` 内，不在顶层 envelope。
- 加固空树成功响应：当业务上允许返回空 `nodes[]` 时，`data` 仍必须包含 `orgVersion` 或 `scopeVersion`、`freshness`、`generatedAt`、`lineage` 和 `readModelSource`。
- 加固不可信空树判定：如果后端 scope 指向可见部门，但这些部门因生命周期、SourceConnection、read model 不可信被过滤，provider 不能返回 `status=ok + 空 nodes`，必须返回稳定错误。
- 补充 Go 测试和 smoke runbook，明确非空组织树能力 smoke 必须使用已知具备可管理组织树的测试账号或 fixture；普通空树只能证明空结果或 fail-closed 分支。

## Out Of Scope

- 不修改 Insight fallback 策略。
- 不让 API/gateway 消费 admin 管理页面 organization-tree JSON。
- 不改变 admin-to-gateway projection contract、refresh worker 或授权事实边界。
- 不新增组织树 UI、菜单入口、组织同步逻辑或跨服务联调脚本。

## Impact

- 主要影响 `admin/controllers/insight_provider.go` 的 organization-tree read model/envelope 构建和可信性校验。
- 主要测试影响 `admin/controllers/insight_provider_test.go`。
- OpenSpec delta 只覆盖 `insight-admin-provider-wrapper` 的 organization-tree smoke contract。
