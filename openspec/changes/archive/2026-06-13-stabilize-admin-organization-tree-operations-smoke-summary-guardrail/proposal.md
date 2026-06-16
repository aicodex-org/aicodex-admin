## Why

组织树运营 smoke 已经有诊断、刷新状态和显式受控重建入口，但 operator 仍需要人工拼接多个响应来判断当前是否可证明 Admin 非空组织树能力。缺少一个只读、脱敏、fail-closed 的 readiness summary，会导致普通空树、consumer-only 结果或 Insight fallback 被误外推为 Admin 组织树运营通过。

## What Changes

- 新增 `organizationTreeOperationsSmokeSummary` 纯函数脚本，把诊断、刷新状态和可选组织树响应汇总为稳定 readiness summary。
- 新增 Bruno 只读 summary 入口，默认只读取诊断接口，可选接收私有变量中的刷新状态和组织树响应，不触发 read model 重建、不写真实 fixture、不访问真实 DB。
- Summary 明确输出 `ready`、`blocked`、`not_checked` 三类状态，以及 `empty_tree`、`non_empty_fixture_missing`、`read_model_untrusted`、`source_connection_stale`、`lineage_missing`、`refresh_status_unavailable`、`sanitization_failed` 等稳定 alias。
- 更新 Bruno README 和 OpenSpec 主规格，说明最小解除条件、owner handoff 和不能外推边界：普通空树、consumer-only 结果或 Insight fallback 不代表 Admin 非空组织树能力通过。

## Capabilities

### New Capabilities

### Modified Capabilities

- `admin-organization-tree-operations`: 增加组织树运营 smoke summary guardrail 的只读汇总、稳定 alias、脱敏输出和不能外推边界。

## Impact

- 影响 `api-tests/bruno/aicodex-admin/scripts/organizationTreeOperationsSmokeSummary.js` 和对应 Node 单测。
- 影响 `api-tests/bruno/aicodex-admin/40-组织树运营` 下的只读 Bruno summary 入口。
- 影响 `api-tests/bruno/aicodex-admin/README.md` 的组织树运营验证说明。
- 影响 `openspec/specs/admin-organization-tree-operations/spec.md` 及本 change 的 OpenSpec artifacts。
- 不修改 API/Insight 仓库，不触碰 `admin/object/platform_api_mapping*` 或 `admin/controllers/platform_api_mapping.go`，不写真实 fixture，不触发真实 read model 重建，不查询/写入/清理真实 DB。
