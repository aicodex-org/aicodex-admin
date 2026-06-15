## Context

`web-admin/` 当前已经有企业认证中心总览、左侧 IA 和认证源中心。`/applications` 仍由 `ApplicationListPage` 直接渲染表格，列表数据里已经包含应用名称、启停状态、`clientId`、`redirectUris`、`scopes`、`grantTypes`、`providers`、证书等字段，可以支持前端只读聚合。`/platform-api-mappings`、`/providers`、`/resources`、`/certs`、`/keys`、`/webhooks` 和 `/records` 已经存在，适合作为应用接入中心的配置和诊断入口。

本 change 属于 Admin 企业认证中心路线，目标是 UI 产品化和信息架构收口，不属于组织边界路线。

## Goals / Non-Goals

**Goals:**
- 在 `/applications` 首屏展示应用接入中心，使管理员能快速扫描应用接入完整度、风险和下一步入口。
- 复用现有 Application 列表数据推导只读状态，并继续渲染原 Application 表格。
- 保持旧应用列表、应用编辑、API 映射、Provider、资源、证书、密钥、Webhook 和审计记录深链接可达。
- 用测试覆盖状态推导、敏感字段不外露、空态和入口链接。

**Non-Goals:**
- 不新增或修改真实 OAuth/OIDC 授权、回调、token、secret、同步或 Gateway projection 执行逻辑。
- 不新增后端写接口，不写入密钥，不触发生产或类生产操作。
- 不重构 `ApplicationEditPage`、`PlatformApiMappingPage` 或 Provider 配置表单。
- 不把本 change 计入组织边界路线进度。

## Decisions

### 1. 在 `/applications` 表格上方嵌入只读中心组件

沿用认证源中心的模式，新增 `ApplicationAccessCenter` 组件并在 `ApplicationListPage.renderTable()` 中渲染。这样 `/applications` 深链接保持不变，旧表格的分页、筛选、复制、编辑和删除仍由 `ApplicationListPage` 接管。

备选方案是新增 `/application-access-center` 路由，但会让既有“应用接入”菜单和总览入口分叉，并增加权限 key 配置成本，因此不采用。

### 2. 只用现有 Application 列表做前端推导

应用接入中心先从当前页 Application 数据推导摘要：应用数量、启用数量、回调地址完整度、授权范围配置、Provider 绑定、OAuth grant/client 状态和风险项。摘要必须是“当前列表视图”的只读状态，不宣称覆盖全量后端聚合。

备选方案是新增后端聚合接口，一次返回全量应用、映射、回调和风险，但当前目标是产品化入口和只读状态，不应扩大到后端契约和权限面。后续若要全量准确统计，再用单独 change 定义只读聚合接口。

### 3. 风险摘要保守、脱敏、可跳转

风险只展示类别和数量，例如“缺少回调地址”“缺少授权范围”“Provider 未绑定”“client_id 待配置”“应用已停用”。组件不得展示 `clientSecret`、token、真实回调参数或其它敏感原值；需要深入处理时跳转到应用编辑、API 映射、Provider、审计记录等旧页面。

### 4. 总览和导航入口改为“应用接入中心”

企业认证中心总览中的应用接入卡片应优先进入 `/applications`，导航叶子文案改为“应用接入中心”，但 key 仍为 `/applications`，以保持组织级 `navItems`/`userNavItems` 权限过滤兼容。

## Risks / Trade-offs

- [当前页统计不等于全量聚合] → 页面文案明确为“当前列表视图”，spec/tasks 记录后续只读聚合接口契约方向。
- [误导管理员认为已经做真实连通性探测] → 所有风险摘要声明只读推导，不触发授权、回调、同步或发布。
- [泄漏敏感字段] → 导出纯函数只返回 display summary，测试断言不包含 `clientSecret`。
- [旧表格行为退化] → 只在表格上方新增组件，不改 fetch、分页、筛选、写操作和编辑路由。
- [移动端文本溢出] → 复用 Ant Design 栅格和当前 Shell 样式，固定卡片最小高度并允许长文本换行。

## Migration Plan

1. 新增 `ApplicationAccessCenter` 组件和状态推导测试。
2. 将组件嵌入 `ApplicationListPage` 表格上方，保留原表格。
3. 更新企业认证中心总览入口和导航文案。
4. 补充样式、OpenSpec 验证、前端测试、构建和可行 UI 验证。
5. 回滚时可移除 `ApplicationAccessCenter` 嵌入和导航文案修改，旧 `/applications` 表格仍可独立工作。
