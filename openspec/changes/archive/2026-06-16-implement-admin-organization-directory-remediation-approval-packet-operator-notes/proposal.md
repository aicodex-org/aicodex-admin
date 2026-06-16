## Why

Admin 组织目录 remediation 链路已经具备 action draft、preflight、execution approval preview 和 approval packet audit。上一阶段的 audit 明确为 `derived_non_persistent`，不能记录真实复制/导出点击事件。Operator 在人工审批和跨 owner 协作时仍需要一份脱敏的交接备注草稿，用于说明审批包上下文、风险、blocker、下一步人工动作和不能自动推断的部分。

本 change 增加 Admin-owned approval packet operator notes / handoff notes。P0 只生成只读草稿，不执行 remediation、不写组织主数据、不把 notes 当作合规持久审计。

## What Changes

- 新增 Admin-owned organization directory remediation approval packet operator notes 派生只读能力，基于 approval packet audit、approval preview、preflight、action draft metadata 生成脱敏 handoff note 草稿。
- 新增后端 API/service/controller/router/authz 设置，输出 `noteId`、`noteHash`、`packetHash`、`approvalPreviewHash`、`executionMode=manual_review_only`、`autoExecutionAllowed=false`、`noteFormat`、`handoffSummary`、`riskSummary`、`statusSummary`、`checklistSummary`、`cannotInfer`、`operatorNextSteps`、`sampleStableHashes`、JSON/Markdown export。
- 扩展 web-admin 组织目录质量页 approval preview / approval packet audit 区域，增加“交接备注/操作员备注”入口，支持查看、复制、导出脱敏 JSON/Markdown，覆盖 loading、empty、error、disabled、long text。
- 补对象、controller/router、前端 wrapper/page tests 和 changed-function coverage，覆盖 ready、blocked、empty/missing packet、cannotInfer、Markdown/JSON redaction、fail-closed。
- 保持只读边界：不执行 remediation、不写组织主数据、不修复关系、不触发 projection publish、不写 Gateway facts、不读取 API/Gateway/Insight 内部库。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-organization-master-model`: 增加 organization directory remediation approval packet operator notes / handoff notes 的只读 API 和 web-admin 交接备注视图行为要求。

## Impact

- 后端：`admin/object` operator notes 派生服务与测试、`admin/controllers/platform_api_mapping.go`、`admin/routers/router.go`、`admin/routers/authz_filter.go`。
- 前端：`web-admin/src/OrganizationDirectoryQualityPage.js`、`web-admin/src/backend/PlatformApiMappingBackend.js`、`web-admin/src/Setting.js` 及相关测试。
- OpenSpec：追加 `admin-organization-master-model` delta spec，并在 archive 后同步主规格。
- 不影响 API、Gateway、Insight、Feishu/WeCom 组织同步、projection publish 或真实数据修复链路。
