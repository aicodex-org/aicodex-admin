## Why

飞书扫码登录已经拉通，但后台还不能把飞书/海外 Lark 通讯录组织架构同步为本地组织主数据。为了让管理员像企业微信同步一样配置、验证、手动或定时同步飞书组织，需要新增一套平行的 FeishuOrganizationSync 能力，并保持登录绑定口径一致，避免同一飞书用户被重复创建。

## What Changes

- 新增飞书/海外 Lark 组织架构同步后台能力，覆盖配置、连接测试、手动全量同步、定时同步和同步记录。
- 新增飞书通讯录客户端，使用与现有 `Lark` Provider 一致的国内飞书/海外 Lark endpoint 模式，基于 Contact v3 拉取部门树、用户和用户-部门关系。
- 同步飞书部门到本地 `Group`，同步飞书用户到本地 `User`，并将用户部门关系写入本地用户组关系。
- 新增飞书专用配置、run、部门映射、用户映射、成员部门关系表，同时写入 `SourceConnection`、`PlatformDepartment`、`PlatformUser`、`PlatformMembership` 和 `ExternalIdentity` 等平台主数据。
- 飞书用户绑定以 `user_id` 为主：写入 `User.Lark`；`open_id`、`union_id`、`tenant_key` 写入属性并沿用历史兼容匹配，避免飞书扫码登录和组织同步割裂。
- 新增 `/api/feishu-org-sync/...` 管理 API 和 Web Admin `/feishu-org-sync` 页面，信息架构对齐企业微信同步页。
- P0 不实现直属上级/部门负责人进入管理范围，也不实现 Insight 过滤；相关字段和平台主数据 lineage 仅保留后续扩展空间。

## Capabilities

### New Capabilities

- `feishu-organization-sync`: 定义飞书/海外 Lark 组织架构同步配置、连接测试、手动/定时同步、同步记录、部门/用户/成员关系映射、本地组织模型投影、平台主数据投影和登录绑定兼容规则。

### Modified Capabilities

- `organization-sync-scheduler`: 增加 `lark` 或 `feishu` provider 的全量组织同步调度执行器注册和派发行为。

## Impact

- 后端对象与服务：新增飞书组织同步配置、run、映射、客户端、同步服务、调度执行器和 Xorm 建表注册；复用通用组织同步调度与平台主数据模型。
- 后端 API 与权限：新增 `/api/feishu-org-sync/config`、`/api/feishu-org-sync/config/test`、`/api/feishu-org-sync/runs` 和 run 详情接口；扩展路由与 authz 模块识别。
- 前端 Web Admin：新增管理工具入口、后端请求封装和 `/feishu-org-sync` 页面，覆盖配置、测试连接、手动全量、定时设置和同步记录。
- 认证兼容：组织同步写入 `User.Lark=user_id` 并保留 OAuth 标识属性，必须与现有飞书扫码登录 `FindLarkUserByIdentifiers` 口径一致。
- 安全与运维：Secret/token 不进入日志、run 错误、文档或报告；连接测试必须验证通讯录读取权限，不能只验证 OAuth 登录配置。
