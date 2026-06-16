## Why

当前企业认证中心已经完成总览、认证源中心和应用接入中心的工作台化，但左侧“审计运维”仍表现为 Sessions / Records / Tokens / Verifications 四个孤立列表入口。管理员需要在会话、审计记录、令牌和验证码记录之间来回跳转，才能判断登录态、失败记录、令牌风险和验证链路是否需要核对。

本轮目标是把审计运维从“杂项列表集合”升级为企业认证中心的运行态核对工作台，并同步导航 IA、配置页导航树和 zh/en 文案。

## What Changes

- 在 `/sessions`、`/records`、`/tokens`、`/verifications` 四个既有页面上方增加审计运维工作台壳层，统一展示运行态摘要、主入口、风险核对和只读边界。
- 将审计运维 IA 聚焦为会话核对、审计记录、令牌核对、验证核对四个主入口；保留既有路由、权限 key、分页筛选、详情抽屉、新增/编辑/删除等原行为。
- 同步更新运行时左侧导航、组织配置页 `NavItemTree`、`zh/en` locale 和聚焦导航测试，避免侧栏与配置树出现不同 IA。
- 审计运维工作台复用上一轮企业认证中心工作台视觉密度，保持安静、专业、可扫描，不做营销 hero、装饰背景、卡片套卡片或大面积单一渐变。
- 不新增真实探测接口，不触发认证/授权/OIDC 回调、会话清理、令牌签发、验证重发、同步任务或 Gateway projection publish。

## Capabilities

### New Capabilities

- `admin-enterprise-identity-audit-operations-center`: 定义审计运维中心的 IA、只读工作台、四类运行态核对入口和安全边界。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 企业认证中心 Shell SHALL 将审计运维入口表达为运行态核对域，并在导航与配置树中复用同一 IA。

## Impact

- 主要影响 `web-admin/src/enterpriseNavigation.js`、`web-admin/src/ManagementPage.navigation.test.js`、`web-admin/src/common/NavItemTree.test.js`、`web-admin/src/locales/zh/data.json`、`web-admin/src/locales/en/data.json`。
- 新增 `web-admin/src/AuditOperationsCenter.tsx` 和聚焦测试，并在 `RecordListPage.js`、`SessionListPage.js`、`TokenListPage.js`、`VerificationListPage.js` 中嵌入只读工作台壳层。
- 少量更新 `web-admin/src/App.less`，复用企业认证中心工作台布局并补充审计运维页面的列表承载间距。
- 含 TSX 改动，必须运行 `yarn typecheck`、聚焦 Jest/coverage、`yarn build`、OpenSpec strict、`git diff --check` 和浏览器验证。
- 不影响后端 API、数据库、真实认证链路、授权执行、密钥、OIDC 回调、Gateway projection 或 `test` 分支。
