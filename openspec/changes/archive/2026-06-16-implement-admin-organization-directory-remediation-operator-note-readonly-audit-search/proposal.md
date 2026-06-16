## Why

Admin remediation approval packet operator notes 和 persistence readiness 已经能派生只读 handoff 草稿与未来持久化准入摘要，但 operator 仍缺少一个统一的只读检索入口来按 organization、remediation run、approval packet、risk、status、checklist alias 等安全字段复核这些交接证据。该能力需要在不引入真实 notes store 的前提下，把当前可派生的 handoff note、readiness、manual review blocker 与脱敏摘要整合成可搜索的 Admin-owned 审计视图。

## What Changes

- 新增 Admin-owned organization directory remediation operator note readonly audit search，只从现有 approval packet audit、operator notes、persistence readiness、approval preview、preflight 和 action draft metadata 派生结果。
- 新增后端只读 service/API/controller/router/authz/DTO，支持按 packet/note/readiness/preview/draft/action/risk/status/checklist/reason/keyword 等安全字段过滤，并返回 stable hash、display-safe label、risk/status/checklist/reason/version/manual_review_only/cannotInfer/redacted fields 等摘要。
- 扩展 web-admin 组织目录质量页，在 operator notes / persistence readiness 附近增加“备注审计检索/交接备注检索”入口，覆盖筛选、loading、empty、error、blocked/readiness-only、cannotInfer、详情查看、脱敏 JSON/Markdown 复制或导出。
- 若当前 Admin-owned 派生数据不能支持跨历史检索，API 和 UI 必须显式返回 `persistenceRequiredForHistoricalSearch=true` 和 `cannotInfer`，并保持 fail-closed；本 change 不新增真实 persistent operator notes store、schema、retention 或 audit write path。
- 保持只读边界：不执行 remediation、不写组织主数据、不修复组织关系、不触发 projection publish、不写 Gateway facts、不读取 API/Gateway/Insight 内部库、不触发 Feishu/WeCom 同步。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-organization-master-model`: 增加 organization directory remediation operator note readonly audit search 的只读 API 和 web-admin 检索视图行为要求。

## Impact

- 后端：`admin/object` 派生搜索 service 与 tests，`admin/controllers/platform_api_mapping.go`、`admin/routers/router.go`、`admin/routers/authz_filter.go`。
- 前端：`web-admin/src/OrganizationDirectoryQualityPage.js`、`web-admin/src/backend/PlatformApiMappingBackend.js`、`web-admin/src/Setting.js` 及相关测试。
- OpenSpec：追加 `admin-organization-master-model` delta spec，archive 后同步主规格。
- 不影响 API、Gateway、Insight、Feishu/WeCom sync、OIDC/auth center shell、WeCom login config、真实 remediation 执行、组织主数据写入或 operator notes 持久化 schema。
