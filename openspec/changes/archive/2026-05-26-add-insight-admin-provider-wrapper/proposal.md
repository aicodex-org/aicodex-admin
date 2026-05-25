## Why

`aicodex-insight` 的 AI 用量洞察 MVP 已经具备本地 mock provider 和 HTTP provider adapter，但仍缺少 `aicodex-admin` 侧稳定的身份、管理范围和组织树契约。当前 `aicodex-admin` 已提供 OIDC、`/api/get-account`、用户、组织、分组、角色和权限等基础能力，但这些接口面向通用认证中心与管理后台，不适合作为 insight 长期依赖的报表 provider。

本变更用于在 `aicodex-admin` 内新增面向 `aicodex-insight` 的只读 admin provider wrapper，让 insight 通过稳定、裁剪后的契约获取当前登录用户、可管理 scope 和组织/部门树，而不是依赖后台页面接口或直接推断权限。

## What Changes

- 新增 `GET /api/admin-provider/insight/v1/current-user`，返回当前 admin 用户的稳定身份、展示字段、角色、分组和可用于用量用户映射的候选字段。
- 新增 `GET /api/admin-provider/insight/v1/current-user/scope`，由 admin 服务端根据当前用户、角色、分组、权限和后续组织管理规则计算 insight 可用的 scope envelope，并返回部门到 `adminUserIds` / `apiUserIds` 的确定映射。
- 新增 `GET /api/admin-provider/insight/v1/current-user/organization-tree`，返回当前用户可见或可管理的组织/分组树，供 insight 做部门筛选和展示。
- 增加 insight provider 专用响应 envelope、错误码、审计日志和字段裁剪规则，避免 insight 依赖 `/api/get-account`、`/api/get-groups` 等后台接口的临时字段。
- 明确 `aicodex-api` 用量用户 ID 的映射规则：能确定时返回 `usageIdentity.apiUserId`、`scope.apiUserIds` 和 `scope.departments[].apiUserIds`，不能确定时显式返回映射状态和失败码，并拒绝用昵称、手机号、展示名做唯一 key。
- 明确非目标：本变更不重做 OIDC/OAuth 登录，不接入或存储用量数据，不访问 `aicodex-api` 数据库，不实现账单/成本权限，不重构现有用户、组织、分组和权限模型。

## Capabilities

### New Capabilities
- `insight-admin-provider-wrapper`: 定义 `aicodex-insight` 从 `aicodex-admin` 只读获取当前用户、管理 scope、组织/分组树、错误语义和审计日志的 provider wrapper 契约。

### Modified Capabilities

## Impact

- 主要影响后端路由和控制器：`admin/routers/router.go`、`admin/controllers/*`。
- 主要影响身份与权限相关对象/服务：`admin/object/user.go`、`admin/object/group.go`、`admin/object/organization.go`、`admin/object/role.go`、`admin/object/permission.go`，以及后续新增的 insight provider DTO/服务文件。
- 需要补充只读接口测试或等效 HTTP 验证，覆盖未登录、无权限、空 scope、用户映射缺失、组织/分组树为空和正常返回。
- 需要补充 AI 可读审计日志，至少包含 `traceId`、`adminUserId`、`organization`、`scopeType`、`groupCount`、`adminUserCount`、`apiUserCount`、`mappingStatus`、`status`。
- 回滚思路：provider wrapper 独立挂载在 `/api/admin-provider/insight/v1/*`，若联调异常可关闭 insight 调用配置或移除新增路由，不影响现有 OIDC、登录页、用户管理和组织/分组管理接口。
