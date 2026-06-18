## Why

Gateway 目前依赖认证中心普通用户 `access_token` 拉取组织架构，令牌会按应用有效期过期，导致同步连接不稳定且需要人工反复复制登录态。认证中心需要提供面向服务间同步的专用凭据，避免把长期组织同步能力绑定在浏览器登录 token 上。

## What Changes

- 新增组织同步专用 API Key，管理员可为指定非 `built-in` 业务组织创建、禁用、删除和轮换同步凭据。
- API Key 明文仅在创建或轮换响应中返回一次，数据库只保存哈希、短前缀和审计元数据。
- API Key 绑定单一组织，只允许读取组织同步所需的组织摘要、群组树和组织应用数据。
- 新增只读组织同步导出 API，并兼容现有网关调用的 `Authorization: Bearer <apiKey>` 读取路径。
- 管理接口由全局管理员或目标组织管理员访问；同步读取接口不创建用户 session，不授予通用管理权限。
- 同步鉴权失败、过期、禁用或组织不匹配时返回稳定错误并避免泄露密钥明文。

## Capabilities

### New Capabilities

- `organization-sync-api-keys`: 定义认证中心为某个组织架构同步生成、管理和校验专用 API Key 的行为，以及同步读取 API 的权限边界。

### Modified Capabilities

- `wecom-organization-sync`: 允许组织同步配置和网关镜像拉取使用专用组织同步 API Key，替代普通登录 `access_token` 作为稳定凭据。

## Impact

- 后端：`admin/object` 新增持久化模型和校验逻辑，`admin/controllers` 新增管理与同步导出接口，`admin/routers` 新增路由和 Bearer 解析兼容。
- 前端：`web-admin` 新增组织同步 API Key 管理入口，支持创建、轮换、禁用、删除和一次性复制明文。
- 数据库：新增 Xorm 管理表保存组织同步 API Key 的哈希、组织绑定、状态、过期时间与最近使用审计字段。
- 网关联动：现有 `aicodex-api` 网关同步弹窗可继续传 `Authorization: Bearer <apiKey>`；后续可切换到专用 `/api/organization-sync/*` 导出接口。
