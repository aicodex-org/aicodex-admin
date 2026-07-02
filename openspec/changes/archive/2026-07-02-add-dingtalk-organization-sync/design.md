## Context

Admin 已有企业微信和飞书/Lark 两套组织架构同步实现：后端按 provider 拆分配置、客户端、运行记录、同步服务、调度执行器和控制器；前端通过统一同步页 shell 展示目标组织、凭据、同步选项、定时同步和运行记录。统一通讯录来源守卫已经预留 `dingtalk` 枚举，但当前只聚合企业微信和飞书/Lark 配置。

钉钉同步需要接入同一条产品路径：管理员在身份控制台选择目标 Admin 组织，填写钉钉企业内部应用 `AppKey` 和 `AppSecret`，先测试连接，再启用同步并手动或定时执行全量差异同步。首版只处理组织主数据，不处理钉钉登录、OAuth 回调和高级交接证据。

## Goals / Non-Goals

**Goals:**

- 按企业微信/飞书已有边界实现钉钉组织同步：配置、连接测试、快照拉取、差异落库、运行记录、调度和页面入口。
- 使用钉钉公开服务端通讯录 API，向同步服务输出稳定的部门、成员、成员部门、部门负责人和直属上级快照。
- 将钉钉配置纳入统一来源状态，保证同一 Admin 组织只存在一个已配置通讯录主数据源。
- 新增 Xorm additive 表，不做破坏性迁移。
- 新增聚焦 Go 和前端测试，覆盖关键契约和回归风险。

**Non-Goals:**

- 不新增钉钉登录、扫码授权、用户敏感资料授权回填或 OAuth 绑定。
- 不新增钉钉 dry-run preview、preview history、binding diagnostics、handoff evidence 或 acceptance checklist。
- 不接管企业微信、飞书/Lark 已有 UI 高级诊断能力。
- 不改下游 API/Gateway/Insight 仓库；钉钉首版只在 Admin 内完成主数据同步基础能力。

## Decisions

1. **以企业微信同步模型为主模板。** 钉钉通讯录同样包含部门、成员、部门负责人和主管关系，接近企业微信而不是飞书 P0。实现将新增独立 `DingTalkOrganizationSync*` 类型和表，避免把 provider 字段混入 WeCom 表。

2. **钉钉组织不自动重定向 `built-in`。** 企业微信已有 Corp ID 业务组织自动初始化历史兼容逻辑；钉钉首版要求管理员选择非 `built-in` 目标组织。这样避免根据 `AppKey` 派生业务组织名导致误建组织，后续若产品需要自动建组织再单独扩展。

3. **客户端只依赖公开 API 的规范化快照。** 钉钉客户端负责 access token、部门列表、用户列表和用户详情分页/解析；同步服务只消费内部快照。若后续钉钉推荐 API 版本变化，可以替换客户端实现而不改变同步落库契约。

4. **单来源守卫使用 provider-neutral 状态服务。** `OrganizationDirectorySourceStatusService` 增加钉钉 store，并让企业微信、飞书和钉钉的保存/执行入口统一调用 `RequireExecutionAllowed`。这比在每个 provider 内两两查询更可维护。

5. **前端复用企业微信基础页节奏。** 钉钉页面新增 `.tsx` 页面和 `.ts` backend 类型，字段为目标组织、AppKey、AppSecret、启用、软禁用、定时同步、连接测试、正式同步记录。页面使用现有 AntD 组件和 `OrganizationSyncShell`，不引入新 UI 框架。

## Risks / Trade-offs

- **钉钉字段权限差异导致部分资料缺失** → 同步以稳定 ID、部门和关系为 P0；手机号、邮箱、头像等可选展示字段缺失时不阻塞同步，也不清空已有本地字段。
- **外部 API 限流或返回结构变化** → 客户端返回安全错误摘要，运行记录不保存 raw response、token 或 secret；测试覆盖当前解析契约。
- **三方来源守卫改动可能影响企业微信/飞书保存路径** → 先写守卫测试覆盖 WeCom、Feishu、DingTalk 互斥，再改实现。
- **新增页面可能复制现有硬编码中文模式** → 首版延续当前组织同步页实践，同时新增菜单/路由关键文案时维护 zh/en locale；后续可单独把组织同步页文案收敛到 i18n。
- **Xorm 自动建表只适合 additive 变化** → 本 change 只新增表和字段；任何删除、重命名或字段收窄都不放入启动同步。

## Migration Plan

1. 新增 OpenSpec delta 并通过 strict validation。
2. 添加后端失败测试：钉钉客户端解析、配置保存脱敏与互斥、运行锁、快照应用、调度执行器。
3. 实现后端模型、Xorm 注册、客户端、配置服务、运行服务、控制器和路由。
4. 添加前端失败测试：backend API 路径、provider logo/类型、页面基础渲染和冲突禁用。
5. 实现前端请求封装、页面、路由、菜单和 API 白名单。
6. 运行 `go test` 聚焦包、OpenSpec validate、前端 focused Jest、`yarn typecheck`、增量 TypeScript gate，按风险再跑 build。

## Open Questions

- 真实钉钉租户联调需要管理员提供可读通讯录权限的企业内部应用凭据；本 change 只提交代码和本地/模拟测试，不写入真实凭据。
- 钉钉登录和敏感资料授权是否进入下一阶段，需要独立 OpenSpec change 决定。
