## Why

企业认证中心 Shell 已经把“应用接入”列为核心分组，但 `/applications` 仍主要是传统应用表格，管理员无法从首屏判断哪些应用接入了认证中心、OAuth/OIDC client 配置是否完整、回调地址和授权范围是否存在风险。当前阶段需要把应用、API 映射、OAuth client、回调地址、授权范围和审计入口产品化为只读的应用接入中心，同时保留既有深链接和写入流程。

## What Changes

- 在企业认证中心 IA 下强化 `/applications` 为“应用接入中心”，在现有 Application 列表上方增加只读工作区。
- 应用接入中心基于现有 Application 列表数据展示接入完整度、启用/停用、回调地址配置、授权范围、OAuth/OIDC client、Provider 绑定和风险摘要。
- 聚合既有入口：应用编辑、API 网关映射、资源/证书/密钥、Provider/OIDC 配置、Webhook、审计记录。
- 数据不足时展示待配置、待巡检或“以既有配置页为准”的空态，不新增真实授权探测。
- 保持 Application 新增、复制、编辑、删除、表格分页、筛选和权限行为不变。
- 不改真实认证/授权/OAuth/OIDC 流程、回调执行、密钥写入、生产配置、同步执行或 Gateway projection publish。

## Capabilities

### New Capabilities

- `admin-enterprise-identity-application-access-center`: 定义 Admin 企业认证中心中应用接入中心的只读状态、配置完整度、风险摘要、入口聚合和降级行为。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 将总览和导航中的应用接入入口收口到 `/applications` 应用接入中心，并保持既有叶子路由兼容。

## Impact

- 主要影响 `web-admin/src/ApplicationListPage.js`、新增应用接入中心组件、`web-admin/src/IdentityConsoleOverview.js`、`web-admin/src/enterpriseNavigation.js`、相关样式和前端测试。
- 复用 `ApplicationBackend` 现有只读列表响应，不新增写接口；如后续需要准确的跨应用聚合状态，应另起 change 定义只读后端聚合接口契约。
- 不影响后端认证协议、OAuth/OIDC 回调、真实密钥、生产/类生产配置、Gateway projection 发布、组织边界路线或其它仓库。
