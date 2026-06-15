## Why

Admin 组织目录 remediation 链路已经提供 remediation plan、manual-review action drafts、preflight 和 execution approval preview。Operator 现在能生成审批预览包，但缺少只读审计/检索/历史视图来追踪同一审批包的生成、复制、导出、状态和风险摘要，导致人工审批前后的操作证据只能靠页面瞬时结果保存。

本 change 在 Admin owner 边界内补齐 approval packet audit/search/history。P0 仍然不执行真实 remediation，不写组织主数据，也不把 Gateway/API/Insight 作为事实源。

## What Changes

- 新增 Admin-owned organization directory remediation approval packet audit 只读能力，基于既有 approval preview、preflight、action draft 元数据派生 deterministic audit/search/history result。
- 新增后端 API/service/controller/router/authz 设置，输出 packet audit id/hash、approval preview hash、event/status summary、risk、affected count、blocked reasons、required approvals、operator checklist digest、sample stable hashes、export summary、storage scope 和 retention policy。
- 扩展 web-admin 组织目录质量页 action draft / preflight / approval preview 区域，增加审批包审计入口，支持筛选/查看、复制/导出脱敏 JSON，并覆盖 loading、empty、error、disabled、blocked、long text 状态。
- 补对象、controller/router、前端 wrapper/page tests 和 changed-function coverage，覆盖 ready、blocked、empty、missing preview、risk/status summary、export redaction、storage scope。
- 保持只读边界：不执行 remediation、不写组织主数据、不修复关系、不触发 projection publish、不写 Gateway facts、不读取 API/Gateway/Insight 内部库。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-organization-master-model`: 增加 organization directory remediation approval packet audit/search/history 的只读 API 和 web-admin 审计视图行为要求。

## Impact

- 后端：`admin/object` remediation approval packet audit 派生服务与测试、`admin/controllers/platform_api_mapping.go`、`admin/routers/router.go`、`admin/routers/authz_filter.go`。
- 前端：`web-admin/src/OrganizationDirectoryQualityPage.js`、`web-admin/src/backend/PlatformApiMappingBackend.js`、`web-admin/src/Setting.js` 及相关测试。
- OpenSpec：追加 `admin-organization-master-model` delta spec，并在 archive 后同步主规格。
- 不影响 API、Gateway、Insight、Feishu/WeCom 组织同步、projection publish 或真实数据修复链路。
