## Why

飞书/Lark 组织架构同步 P0 已能执行配置、连接测试、手动全量和定时同步，但失败后的同步记录仍偏底层：operator 很难快速判断失败发生在哪个业务阶段、属于凭证/权限/限流/数据契约/投影哪类问题，以及是否可以安全重试。

本 change 增强 Feishu 同步运行诊断和失败分流，让后台同步记录直接给出脱敏统计、失败分类、重试准备状态和下一步处理动作，降低真实租户运行态排障成本。

## What Changes

- 为 Feishu 组织同步 run 增加规范化诊断输出，覆盖失败阶段、失败分类、原因码、重试准备状态、operator action、脱敏统计和安全错误摘要。
- 扩展 run 列表/详情 API，或新增 run diagnostics endpoint，确保同步记录和详情都能读取诊断信息。
- 在后端把配置校验、tenant token、部门拉取、用户拉取、部门/用户/关系 upsert、平台投影、软禁用、调度派发等错误归一到稳定阶段和分类。
- 在 Web Admin 飞书组织同步页面展示失败分类、retry action、关键 counts、耗时和最近错误摘要，保持后台表格/详情的信息密度。
- 增加 mock/contract/fail-closed 测试，覆盖失败映射、重试建议、脱敏、run detail 不存在或不可用场景。
- 不读取真实 secret，不触发真实租户同步，不写真实租户 fixture；真实 Contact v3 权限验证仍作为后续运行态 gate。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `feishu-organization-sync`: 增强 Feishu/Lark 组织同步 run inspection 和 admin UI 的诊断要求。
- `organization-sync-scheduler`: 增强 Feishu/Lark 定时派发失败时的诊断字段和安全错误分类要求。

## Impact

- 后端对象与服务：`admin/object/feishu_organization_sync*.go`、同步 run 查询/详情、失败处理和调度执行器。
- 后端 API：`admin/controllers/feishu_organization_sync.go`、`admin/routers/router.go` 如需新增 diagnostics endpoint。
- 前端：`web-admin/src/FeishuOrganizationSyncPage.js`、`web-admin/src/backend/FeishuOrganizationSyncBackend.js` 及对应测试。
- OpenSpec：更新 `feishu-organization-sync` 和 `organization-sync-scheduler` delta specs。
- 验证：Go object/controller/router 聚焦测试、前端 backend/page 聚焦测试、changed-function 覆盖率、OpenSpec validate 和 `git diff --check`。
