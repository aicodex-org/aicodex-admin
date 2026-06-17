# Change: improve-admin-enterprise-llm-ai-gateway-center

## Why
Admin 企业认证中心已经把组织身份、认证源、应用接入和审计运维梳理成工作台，但原 `LLM AI` 与 Gateway 相关区域仍更像后台配置菜单：侧边栏直接进入 Agents 列表，总览页使用 `LLM AI / Gateway 投影` 作为主标签，Gateway 诊断区也把 projection 实现术语暴露为管理员主要标题。

管理员需要看到的是 LLM AI 接入、MCP 资源、规则/站点、网关身份映射和只读诊断的治理入口，而不是把 `Gateway projection` 当作主产品概念。

## What Changes
- 在 `/agents` 列表首屏增加 `LLM AI 网关中心` 工作台，基于当前 Agents 列表和既有路由提供只读摘要、风险待办和配置入口。
- 调整企业认证中心导航、组织 navItems 配置树和身份治理总览文案，避免 `Gateway 投影` 成为面向管理员的主标签。
- 将 `PlatformApiMappingPage` 中面向管理员的 Gateway 区域标题改为更产品化的网关身份巡检/发布记录口径，保留低层诊断说明中的 projection 边界。
- 保留既有路由、权限 key、接口调用、Gateway publish/projection 执行行为、认证链路和生产/类生产配置。

## Out of Scope
- 不新增或修改真实 Gateway projection publish、ingestion、cleanup 或回执执行链路。
- 不修改 OAuth/OIDC 回调、登录、授权、Provider contract 或真实认证链路。
- 不读取或写入 API/Gateway/Insight 内部库，不写 Gateway authorization facts。
- 不归档、删除、重写其它 active OpenSpec change，不合入或 push `hfl-test-base`，不触碰 `test` 分支。
