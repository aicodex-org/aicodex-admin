## ADDED Requirements

### Requirement: Admin 核心后台路由页面 TypeScript batch 迁移
Admin 前端 SHALL 支持将核心后台路由页面按渐进 TypeScript 路线批量迁移为 `.tsx`，并保持现有路由、菜单、权限、接口、查询、分页、排序、表单、详情抽屉、复制、删除、同步操作和敏感字段脱敏行为兼容。

#### Scenario: 指定核心页面迁移为 TSX
- **WHEN** 审计运维列表页、凭据/令牌中小编辑页、连接/同步中小编辑页和身份控制台总览页被迁移
- **THEN** 页面文件 SHALL 使用 `.tsx` 承载 React 组件
- **AND** `ManagementPage` 的无后缀 import SHALL 保持兼容
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `ManagementPage.js`、`App.js`、`Setting.js`、`BaseListPage.js`、`LoginPage.js`、认证/OIDC、Provider/Application/Syncer 主编辑页或后端 API wrapper

#### Scenario: 审计运维行为保持兼容
- **WHEN** 管理员访问 `/records`、`/sessions`、`/tokens` 或 `/verifications`
- **THEN** 查询、更多筛选、分页、排序、详情抽屉、复制、删除确认、新增令牌、编辑令牌、删除令牌和删除会话行为 SHALL 与迁移前保持兼容
- **AND** token、验证码、Cookie、client secret 或其它可复用敏感凭据原值 SHALL NOT 因迁移被新增展示到列表列或详情摘要

#### Scenario: 编辑页和同步页行为保持兼容
- **WHEN** 管理员访问证书、密钥、令牌、LDAP 或 Webhook 相关编辑/同步页面
- **THEN** 页面加载、表单字段、保存、删除、测试连接、同步触发、跳转和错误提示行为 SHALL 与迁移前保持兼容
- **AND** 迁移 SHALL NOT 改变后端 API 参数结构、请求顺序或路由语义

#### Scenario: 可顺手小页面迁移可 deferred
- **WHEN** `AccountPage`、`basic/AppListPage`、`basic/Dashboard`、`EntryPage`、`CaptchaPage` 或 `QrCodePage` 等小型页面迁移遇到明显超出预期的外部类型洞
- **THEN** 该页面 MAY 被记录为 deferred
- **AND** deferred SHALL NOT 阻塞已确认 P0 页面完成迁移和验证

#### Scenario: TSX 类型边界明确
- **WHEN** 页面读取 props、state、route params、分页状态、筛选状态、表单状态、审计记录、会话记录、令牌记录、验证码记录、证书、密钥、LDAP、Webhook 或后端响应
- **THEN** 迁移 SHALL 使用局部 TypeScript interface/type 描述页面实际消费字段
- **AND** 对 legacy JS 父类、动态后端字段或第三方组件边界的断言 SHALL 保持局部化，不得扩散为全局宽松类型

#### Scenario: Batch 迁移验证通过
- **WHEN** Admin 核心后台路由页面 TSX batch 迁移完成
- **THEN** OpenSpec change validation、`git diff --check`、审计运维聚焦 Jest 测试、`IdentityConsoleOverview` 测试、触碰页面可用现有测试、`yarn typecheck`、增量 TypeScript gate 和 `yarn build` SHALL pass for touched TSX and JS coexistence paths
- **AND** 若迁移包含页面行为或样式的非机械变化，SHALL 补充本地浏览器 smoke 或记录明确阻断
