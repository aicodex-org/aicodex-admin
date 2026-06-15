## Why

飞书/Lark 组织同步已经具备配置、连接测试、手动全量、定时执行和失败诊断，但 operator 在真实写入前仍无法预估一次全量同步会新增、更新、软禁用或冲突多少部门、用户和成员关系。

本 change 增加 dry-run diff / preview console，让管理员在执行真实同步前用只读方式预览影响范围、风险分类和安全诊断，降低错误凭证、异常快照或大规模软禁用带来的生产风险。

## What Changes

- 新增 Feishu/Lark 组织同步 dry-run preview API，使用现有配置和 Contact snapshot 拉取流程计算差异，但不写入 `Group`、`User`、Feishu 映射、平台主数据、run final state 或 Gateway authorization facts。
- 新增 dry-run diff 服务对象，返回部门、用户、成员关系的 `toCreate`、`toUpdate`、`toSoftDisable`、`unchanged`、`conflict`、`invalid` 聚合计数、reason counts、source/tenant/app alias 和安全诊断。
- 在凭证缺失、权限不足或运行态授权不可用时 fail-closed，返回稳定诊断码，不假装预览成功。
- Web Admin 飞书组织同步页面新增 preview 操作区、diff summary、风险/失败诊断和最近 preview 摘要，保持工作型后台的信息密度。
- 增加 Go object/controller/router 聚焦测试和前端 backend/page 测试，覆盖不写入、差异分类、脱敏、空快照、冲突/invalid、credential/permission fail-closed。
- 不读取真实 secret，不触发真实租户同步，不写真实租户 fixture，不读取 API/Insight 内部库。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `feishu-organization-sync`: 增加 Feishu/Lark 组织同步 dry-run preview API、只读差异计算和 Web Admin preview console 要求。

## Impact

- 后端对象与服务：`admin/object/feishu_organization_sync*.go`，新增 dry-run diff 计算、脱敏响应和 fail-closed 诊断。
- 后端 API：`admin/controllers/feishu_organization_sync.go` 和路由鉴权测试，新增 `/api/feishu-org-sync/dry-run-preview` 或等价明确 dry-run endpoint。
- 前端：`web-admin/src/FeishuOrganizationSyncPage.js`、`web-admin/src/backend/FeishuOrganizationSyncBackend.js` 及对应测试。
- OpenSpec：更新 `feishu-organization-sync` delta spec，归档后同步主规格。
- 验证：OpenSpec validate、Go focused tests、前端 focused tests/build、changed-function 覆盖率和 `git diff --check`。
