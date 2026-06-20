## Context

当前 `aicodex-api` 的组织镜像同步会把弹窗中填写的凭据作为 `Authorization: Bearer <value>` 调用认证中心的 `/api/get-organizations`、`/api/get-groups` 和 `/api/get-organization-applications`。认证中心的 `AutoSigninFilter` 会把 Bearer 值当成普通 OAuth access token 查询 `Token` 表，并用 `CreatedTime + ExpiresIn` 判定过期。这使同步能力依赖浏览器登录态，过期后会返回 `Access token has expired`。

认证中心已有通用 `Key` 对象，但它语义泛化、`accessSecret` 明文保存，且没有被组织同步鉴权链路使用，不适合作为跨服务组织同步凭据。新能力需要遵循现有 Beego + Xorm 模式，避免引入新依赖或改变现有登录 token 生命周期。

## Goals / Non-Goals

**Goals:**

- 为指定业务组织生成稳定的组织同步专用 API Key。
- 明文只展示一次，数据库只保存哈希、短前缀和审计字段。
- 允许全局管理员或目标组织管理员管理该组织的同步 Key。
- 允许现有网关继续以 Bearer 方式调用旧的三个只读组织接口。
- 提供专用只读导出 API，作为后续网关切换的明确目标。
- 鉴权失败时返回稳定、脱敏的错误信息。

**Non-Goals:**

- 不复用或扩展普通用户 OAuth access token 的有效期。
- 不把组织同步 Key 转换为浏览器 session 或通用管理员身份。
- 不允许组织同步 Key 写入组织、群组、应用或用户数据。
- 不在本变更中修改 `aicodex-api` 网关代码；认证中心侧保持兼容。

## Decisions

### 新增专用 `OrganizationSyncApiKey`

新增 Xorm 对象保存组织同步凭据元数据：`owner/name`、`organization`、`displayName`、`keyPrefix`、`keyHash`、`state`、`expireTime`、创建/更新时间、创建者、最近使用时间和最近使用 IP。明文格式使用 `osak_` 前缀加高熵随机串，便于 `AutoSigninFilter` 在查询普通 `Token` 表之前识别专用 Key。

备选方案是复用现有 `Key` 表。该方案会继承明文 `accessSecret` 存储和泛化语义，且难以明确限制只读组织同步能力，因此不采用。

### Key 校验不创建普通登录态

`AutoSigninFilter` 识别 `osak_` 后只做专用 Key 校验，并把校验结果写入 request context，例如绑定组织、Key ID 和同步主体标记。它不会写入 `username` session，也不会把调用者伪装成 `built-in/admin`。

为兼容现有网关，`ApiFilter` 对旧的三个组织读取接口识别同步主体并允许通过；控制器再按绑定组织过滤数据。其它 API 即使携带同步 Key，也不能获得普通 API 权限。

### 管理 API 与读取 API 分离

管理 API 位于 `/api/organization-sync-api-keys*`，由普通登录态鉴权，并限制为全局管理员或目标组织管理员。读取 API 位于 `/api/organization-sync/export`，只接受有效组织同步 Key，返回组织、群组、应用的组合导出结果。

旧接口兼容只覆盖：

- `GET /api/get-organizations?owner=admin`
- `GET /api/get-groups?owner=<organization>`
- `GET /api/get-organization-applications?owner=admin&organization=<organization>`

### 过期和状态语义

`state=Active` 且未超过 `expireTime` 的 Key 才可使用。空 `expireTime` 表示不自动过期。使用成功后异步或轻量更新最近使用时间、IP 和 user-agent 摘要，便于管理员排查同步来源。

## Risks / Trade-offs

- [旧接口 Bearer 兼容扩大代码分支] → 仅在三个 GET 读取接口启用同步主体，并在控制器内二次校验绑定组织。
- [管理员误以为 Key 是通用 API Key] → 前端文案、字段名和明文展示都使用“组织同步 API Key”，并标注只读同步用途。
- [Key 泄露后可读取组织结构] → 只存哈希、支持禁用和轮换、绑定单组织、禁止 built-in、审计最近使用信息。
- [长期 Key 可能缺少轮换纪律] → 创建时支持过期时间，列表展示过期状态，轮换会生成新明文并替换旧哈希。

## Migration Plan

1. 通过 Xorm `Sync2` 添加 `OrganizationSyncApiKey` 表，不改变现有 Token 或 Key 表。
2. 部署后管理员为目标组织创建同步 Key，把一次性明文填入网关现有“认证中心 Access Token/API Key”输入框。
3. 若出现问题，可禁用或删除新 Key；普通登录和现有 OAuth token 流程不受影响。

## Future Follow-ups

- 后续 `aicodex-api` 可通过单独 change 评估是否切换到 `/api/organization-sync/export` 一次性导出接口，以减少三次请求和旧接口兼容分支；本 change 已保持旧接口 Bearer 兼容。
- 生产配置是否强制组织同步 Key 设置过期时间由后续安全策略 change 决定；本 change 先允许空过期时间以满足服务间稳定同步，并提供禁用、删除和轮换能力。
