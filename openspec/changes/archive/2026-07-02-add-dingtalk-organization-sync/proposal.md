## Why

现有组织架构同步已经覆盖企业微信和飞书/Lark，但使用钉钉作为企业通讯录主数据源的客户无法在 Admin 中配置、验证和同步部门/成员数据。需要按既有通讯录同步边界补齐钉钉，保持“一个 Admin 组织只能配置一个通讯录来源”的安全约束。

## What Changes

- 新增钉钉组织架构同步配置、连接测试、手动全量差异同步、同步记录查询和定时同步能力。
- 新增钉钉通讯录客户端，基于官方服务端 API 拉取 access token、部门、成员和成员详情，并规范化为本地同步快照。
- 新增钉钉同步持久化对象：配置、运行记录、部门映射、成员映射、成员部门关系、部门负责人关系和直属上级关系。
- 将钉钉接入统一组织通讯录来源状态与执行判定，防止同一 Admin 业务组织同时配置企业微信、飞书/Lark 和钉钉。
- 在 Web Admin 增加“钉钉同步”入口和基础同步页面，复用企业微信/飞书的同步页节奏、调度设置、连接测试、同步记录和冲突提示。
- 首版不新增钉钉扫码登录、OAuth 绑定、dry-run preview、交接证据、修复向导或下游 Insight/Gateway 特有验收面板。

## Capabilities

### New Capabilities
- `dingtalk-organization-sync`: 钉钉通讯录组织架构同步配置、执行、映射持久化、API、页面和基础测试覆盖。

### Modified Capabilities
- `organization-sync-scheduler`: 调度器新增 `dingtalk` provider 执行器与调度配置。
- `organization-directory-source-status`: 统一通讯录来源状态聚合纳入钉钉配置，继续执行单组织单来源约束。
- `admin-enterprise-organization-identity-center`: 身份控制台管理导航新增钉钉同步入口。
- `web-admin-incremental-typescript`: 钉钉同步新增前端页面、类型和请求封装必须保持 TS/TSX 稳态。

## Impact

- 后端：`admin/object` 新增钉钉同步模型、客户端、配置服务、运行服务、调度执行器和测试；`admin/controllers` 新增钉钉同步 API。
- 前端：`web-admin/src` 新增钉钉同步页面、后端请求封装、路由/菜单入口和聚焦测试。
- 数据库：通过现有 Xorm 同步路径新增钉钉同步相关表；不做破坏性 schema 迁移。
- API：新增 `/api/dingtalk-org-sync/...` 模块命名空间；不修改企业微信和飞书/Lark 既有路径。
- 文档/规格：新增钉钉同步规格，并更新调度器、统一来源状态、导航和 TS 稳态相关规格。
