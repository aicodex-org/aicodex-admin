## Why

当前 Admin 已有左侧壳层基础，但首页和导航仍更像后台配置集合，无法让管理员快速理解“企业认证中心”的核心能力、风险状态和下一步入口。阶段 1 需要先建立企业级身份治理控制台的产品心智和信息架构，为后续组织、认证源、应用接入和 Gateway 投影运营能力铺底。

## What Changes

- 将管理员默认首页改造成“身份治理总览”，直接展示企业认证中心关键域的只读状态、风险提示和操作入口。
- 重组 Admin 左侧导航信息架构为：总览、组织与身份、认证源、应用接入、Gateway 投影、审计与运维，并复用既有页面路由。
- 首页展示已有能力的轻量入口和状态：组织主数据、企业微信/飞书/OIDC、应用接入/API 映射、Gateway 投影、最近失败/待处理风险。
- 保留既有页面内部实现，不改认证链路、组织同步后端、Gateway projection publish 执行逻辑和真实数据模型。
- 覆盖加载、空态、错误态、无权限/无数据和窄屏展示，避免文本溢出或营销化 landing page。

## Capabilities

### New Capabilities

- `admin-enterprise-identity-console-shell`: 定义 Admin 企业认证中心总览页、导航信息架构、状态入口和只读降级行为。

### Modified Capabilities

## Impact

- 主要影响 `web-admin/src/ManagementPage.js`、`web-admin/src/basic/Dashboard.js` 或新增总览组件、相关样式和前端测试。
- 复用既有前端 backend 封装或现有页面路由；如数据不足，使用只读、mock-safe 的前端聚合与降级文案，不新增大型后端模型。
- 不影响后端认证协议、组织同步、Gateway 投影发布、API/Insight/RedClaw 仓库，也不写真实 fixture 或生产/类生产数据。
