## Context

企业微信组织同步已经提供了管理员配置、连接测试、手动全量、定时同步、执行记录、本地 `Group` / `User` 投影和平台主数据投影的实现路径。飞书登录侧已经使用 `Lark` Provider 支持国内飞书和海外 Lark，且登录绑定规则要求优先使用 `user_id`，历史 `open_id` / `union_id` 作为兼容匹配。

本 change 新增平行的 `FeishuOrganizationSync` 模块，不把企业微信实现改造成多分支大模块，也不复用旧 `admin/object/syncer_lark.go` 作为主实现。旧 Lark syncer 只可作为接口经验参考，因为它缺少组织树、运行审计、软禁用、平台主数据投影和同步页面所需能力。

## Goals

- 提供飞书/海外 Lark 组织同步配置、连接测试、手动全量同步、定时同步和同步记录。
- 同步飞书部门树、用户、用户-部门关系到本地 `Group`、`User` 和用户组关系。
- 持久化飞书专用配置、运行记录、部门映射、用户映射和用户部门关系。
- 写入或更新 `SourceConnection`、`PlatformDepartment`、`PlatformUser`、`PlatformMembership`、`ExternalIdentity` 和同步批次 lineage。
- 保持组织同步与飞书扫码登录一致：`user_id -> User.Lark`，并保留 `open_id`、`union_id`、`tenant_key` 属性用于历史兼容匹配。
- 使用国内飞书 `open.feishu.cn / accounts.feishu.cn` 与海外 Lark `open.larksuite.com / accounts.larksuite.com` 的显式 endpoint 模式。

## Non-Goals

- 不在 P0 实现直属上级或部门负责人进入管理范围。
- 不在 P0 实现 Insight 过滤或报表 scope provider 变更。
- 不在 P0 实现飞书事件回调增量同步。
- 不在 P0 做完整 dry-run 预览。
- 不把旧 `syncer_lark.go` 扩展为本次主实现。
- 不把飞书来源写入 `wecom` sourceType 或复用企业微信专用表。

## Decisions

### 1. 新增平行 FeishuOrganizationSync 模块

飞书同步新增独立对象、客户端、服务、控制器、调度执行器和前端页面。企业微信实现可作为结构参照，真实通用点只复用已有 `OrganizationSyncSchedule`、平台主数据对象和通用辅助函数，避免企业微信/飞书分支交织在同一业务服务中。

### 2. sourceType 采用 Feishu/Lark 共享口径

现有登录 Provider 类型为 `Lark`，同时支持国内飞书和海外 Lark。组织同步侧 `SourceConnection.sourceType` 使用同一共享口径，首选 `lark`；如果已有平台主数据约定要求中文业务源，可兼容 `feishu`，但不得写成 `wecom`。`sourceTenantId` 优先使用 `tenant_key`；如果 P0 连接测试无法稳定取得 `tenant_key`，先使用 `app_id` 派生，并在 `SourceConnection.metadata` 记录 endpoint mode，后续在成功获取租户信息后补正。

### 3. 飞书用户绑定与登录保持一致

用户同步匹配顺序与飞书登录兼容：

1. 以组织维度和飞书 `user_id` 查找已有 `User.Lark`。
2. 未命中时使用现有 `FindLarkUserByIdentifiers` 风格的候选标识，兼容历史 `open_id` / `union_id` 绑定。
3. 匹配到历史用户后回填 `User.Lark=user_id`。
4. 新建用户时使用稳定本地用户名，例如 `feishu-user-<hash(user_id)>`，不使用姓名、邮箱、手机号作为唯一 join key。

`open_id`、`union_id`、`tenant_key`、`app_id` 和 endpoint mode 保存到用户属性，不覆盖登录链路已有属性语义。敏感资料字段只有在飞书返回非空时更新；权限不足导致缺失时不清空本地已有资料。

### 4. 部门、用户和关系投影

飞书部门映射到 `Group`：

- `Group.Owner` 为目标业务组织。
- `Group.Name` 使用稳定前缀和 bounded hash，例如 `feishu-dept-<tenant/app短码>-<department_id短码>`，避免全局唯一约束冲突。
- `Group.DisplayName` 使用飞书部门名称。
- `Group.ParentId` 指向父部门对应本地 Group。
- `Group.Type` 使用 `feishu-department`。

飞书用户映射到 `User`：

- `User.Owner` 为目标业务组织。
- `User.Lark` 保存飞书 `user_id`。
- `User.ExternalId` 可写入长度受控的 `lark:<tenant/app>:<user_id>`，完整值保留在映射表。
- `User.Groups` 只增删飞书来源部门组，保留非飞书组。

用户-部门关系保存到 `feishu_user_department` 并投影到 `PlatformMembership`。P0 不将 leader/manager 关系纳入管理范围，但同步服务和平台 lineage 不应阻断后续扩展。

### 5. 飞书客户端和连接测试

客户端封装为规范化快照接口，不把同步服务绑定死在单个 API 路径上。P0 使用官方 Contact v3 能力：

- 使用企业自建应用 `tenant_access_token/internal` 获取 `tenant_access_token`。
- 通过 `contact/v3/departments/:department_id/children` 拉取部门树。
- 通过 `contact/v3/users/find_by_department` 或 `contact/v3/users/:user_id` 拉取用户资料和部门关系。

连接测试必须至少完成 token 获取、部门读取和用户读取权限验证。扫码登录可用不代表通讯录权限足够，因此 OAuth Provider 配置成功不能替代组织同步连接测试。

### 6. 同步执行、软禁用和定时

手动和定时同步均创建 `FeishuOrganizationSyncRun`，并通过组织维度运行锁避免重复执行。全量同步不是清空重建：

1. 拉取完整部门、用户和用户部门关系快照。
2. 基于飞书稳定 ID 和本地映射计算 upsert/disable 计划。
3. 写入本地 `Group`、`User`、用户组关系、飞书映射表和平台主数据。
4. 只有完整成功时才按配置软禁用本次缺失的飞书来源部门、用户和关系。

失败或部分失败只记录 run 状态和安全错误摘要，不根据缺失数据执行软禁用。

### 7. API 和前端

后端新增模块化 API：

- `GET /api/feishu-org-sync/config`
- `POST /api/feishu-org-sync/config`
- `POST /api/feishu-org-sync/config/test`
- `POST /api/feishu-org-sync/runs`
- `GET /api/feishu-org-sync/runs`
- `GET /api/feishu-org-sync/runs/:runId`

前端新增 `/feishu-org-sync` 页面和管理工具入口。页面对齐企业微信同步页，但字段为目标组织、App ID、App Secret、endpoint mode、启用同步、软禁用缺失数据、定时同步、测试连接、开始全量同步和同步记录表。

## Migration Plan

- 使用现有 Xorm `Sync2` 初始化新增飞书同步表，新增表和可空字段为 additive 变更。
- 新增通用调度 provider 常量或注册值，注册 `lark`/`feishu` 的 full differential executor。
- 不做破坏性 schema 变更，不清理历史用户、组或企业微信表。

## Risks / Trade-offs

- 飞书 app 未开通通讯录权限时，连接测试和同步会失败；错误摘要必须脱敏并明确权限类别。
- `tenant_key` 在组织同步凭证流中可能无法稳定取得；P0 允许以 `app_id` 派生业务组织和 source tenant，后续拿到租户信息后补正 metadata。
- 飞书/Lark 命名存在产品与 Provider 类型差异；设计和 UI 需要明确“国内飞书/海外 Lark 共享 Lark Provider 与同步 sourceType”。
- 本次不接入管理范围和 Insight 过滤，因此后续 P1 需要基于已落的平台主数据继续扩展，而不是读取飞书专用表作为长期权威。
