## Why

Admin remediation approval packet operator notes 目前是 `derived_note_draft` / `not_persisted` / `manual_review_only` 的只读草稿。若后续要引入真实 operator note store，需要先让 operator 和实现方看到权限、幂等、保留期、审计语义、脱敏字段、manual review gate 与 cannotInfer 边界是否齐备，否则容易把派生草稿误当成可写审计事实。

## What Changes

- 新增 Admin-owned organization directory remediation operator note persistence readiness 只读能力，基于现有 approval packet operator notes metadata 生成持久化前准入摘要。
- 输出 `readinessId`、`readinessHash`、`readinessStatus`、`readyForPersistenceDesignReview`、`persistenceAllowed=false`、`storeDecisionRequired=true`、`idempotencyKey`、权限/保留期/审计/脱敏/manual review/cannotInfer 检查清单、blocked reasons、safe summary 与 export summary。
- 新增后端 service/API/router/authz/Setting allowlist 与前端组织目录质量页入口，在交接备注附近展示“持久化准入”面板，并支持复制/导出脱敏 JSON。
- P0 不新增真实持久表，不保存 operator notes，不执行 remediation，不写组织主数据，不触发 projection publish，不读写 Gateway/API/Insight 内部事实。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-organization-master-model`: 增加 organization directory remediation operator note persistence readiness 的只读 API 和 web-admin 展示要求。

## Impact

- 后端：新增 `admin/object` readiness service 与 tests，扩展 `admin/controllers/platform_api_mapping.go`、`admin/routers/router.go`、`admin/routers/authz_filter.go`。
- 前端：扩展 `web-admin/src/OrganizationDirectoryQualityPage.js`、`web-admin/src/backend/PlatformApiMappingBackend.js`、`web-admin/src/Setting.js` 及相关测试。
- OpenSpec：追加 `admin-organization-master-model` delta spec，archive 后同步主规格。
- 不影响 API、Gateway、Insight、Feishu/WeCom 同步、OIDC/auth center shell、真实 remediation 执行或组织主数据写入。
