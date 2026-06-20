# web-admin-incremental-typescript Specification

## Purpose
定义 `web-admin` 渐进式 TypeScript 基建规则，使 React 18 管理端可以在保持既有 JavaScript 行为兼容的前提下逐步新增或迁移 `.ts` / `.tsx` 文件，并通过 `yarn typecheck`、聚焦测试和构建形成后续 TS/TSX change 的标准验证入口。
## Requirements
### Requirement: 渐进式 TypeScript 工具链
`web-admin` SHALL 支持 React 18 项目内 `.js`、`.ts`、`.tsx` 文件共存，并通过 TypeScript 配置和依赖让新增 TS/TSX 文件可以被本地验证、测试和生产构建接纳。

#### Scenario: JS 和 TSX 共存构建
- **WHEN** 开发者在 `web-admin/src` 下同时保留既有 `.js` 文件并新增或迁移 `.tsx` React 组件
- **THEN** `yarn build` SHALL 能通过 CRACO/React Scripts 构建该混合源码树
- **AND** 本 change 不要求全量迁移既有 `.js` 文件

#### Scenario: TypeScript 配置不检查历史 JS
- **WHEN** 开发者运行 TypeScript 静态检查
- **THEN** TypeScript 配置 SHALL 允许 JS 文件参与模块解析
- **AND** TypeScript 配置 SHALL NOT 强制 `checkJs` 检查全部历史 JS

### Requirement: Typecheck 验证入口
`web-admin` SHALL 提供 `yarn typecheck` 或等价脚本，用于执行 `tsc --noEmit`，并作为后续含 TS/TSX 前端 change 的标准验证项。

#### Scenario: 开发者运行类型检查
- **WHEN** 开发者在 `web-admin` 目录运行 `yarn typecheck`
- **THEN** 命令 SHALL 执行 TypeScript no-emit 检查
- **AND** 命令 SHALL 在当前 TS/TSX smoke 迁移代码上返回成功

### Requirement: 后续新增代码约定
Admin 前端后续新增 React 组件 SHALL 默认使用 `.tsx`；新增共享逻辑、接口模型和类型定义 SHALL 默认使用 `.ts`；既有 JS SHALL 只在被需求触及时渐进迁移。

#### Scenario: LLM AI/Gateway AI Agent 入口页迁移
- **WHEN** 后续 change 触碰 `LLM AI/Gateway` 菜单下的 AI Agent 入口页面
- **THEN** `AgentListPage` 和 `AgentEditPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、Agent 记录、列表 fetch 参数、表格列、路由参数和编辑表单字段
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持 `/agents` 和 `/agents/:organizationName/:agentName` 路由、权限、接口、文案、`LlmAiGatewayCenter` 总览块、Agent 列表操作、编辑保存删除语义和页面行为不变
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `AgentBackend.js`、`LlmAiGatewayCenter` 视觉布局、MCP Server、MCP Store、入口配置、站点范围、治理规则、应用接入、组织账号或权限角色页面

#### Scenario: LLM AI/Gateway Agent migration is validated
- **WHEN** `AgentListPage` 和 `AgentEditPage` 被迁移为 TSX
- **THEN** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 或等价导入边界验证 SHALL pass for touched TSX and JS coexistence paths
- **AND** 覆盖率证据 SHALL 以迁移后的 Agent 页面和对应测试为重点，不得用全仓平均覆盖率替代受影响文件覆盖率

### Requirement: LLM AI/Gateway 入口配置页面渐进迁移
Admin 前端 SHALL 支持将 LLM AI/Gateway 菜单下的入口配置页面从 legacy JavaScript 渐进迁移为 TSX，并在不扩大到认证入口或其它网关页面的前提下保持现有行为兼容。

#### Scenario: 入口配置页面迁移
- **WHEN** 后续 change 触碰 `LLM AI/Gateway` 菜单下的入口配置页面
- **THEN** `EntryListPage` 和 `EntryEditPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、Entry 记录、列表 fetch 参数、表格列、路由参数和编辑表单字段
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持 `/entries` 和 `/entries/:organizationName/:entryName` 路由、权限、接口、文案、Entry 列表操作、编辑保存删除语义和页面行为不变
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `EntryBackend.js`、`EntryPage.js`、MCP Server、MCP Store、站点范围、治理规则、规则表格、应用接入、组织账号或权限角色页面

#### Scenario: 入口配置迁移验证
- **WHEN** `EntryListPage` 和 `EntryEditPage` 被迁移为 TSX
- **THEN** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 或等价导入边界验证 SHALL pass for touched TSX and JS coexistence paths
- **AND** 覆盖率证据 SHALL 以迁移后的 Entry 页面和对应测试为重点，不得用全仓平均覆盖率替代受影响文件覆盖率

### Requirement: 低风险 TSX smoke 迁移
本 change SHALL 迁移一个低风险展示组件作为 TSX smoke test，证明 TypeScript 基建覆盖编译、测试、typecheck 和 build 路径，同时避开认证、授权、OAuth/OIDC、Provider contract、Gateway projection 与真实配置链路。

#### Scenario: Smoke 组件可被测试和构建
- **WHEN** smoke 组件迁移为 `.tsx`
- **THEN** 聚焦测试 SHALL 覆盖该组件的可观察输出或可测试 helper
- **AND** `yarn typecheck` 与 `yarn build` SHALL 接纳该 `.tsx` 文件

#### Scenario: Smoke 迁移不改变敏感链路
- **WHEN** 本 change 完成 TSX smoke 迁移
- **THEN** 迁移文件 SHALL NOT 位于 `auth/`、`provider/` 或 Gateway projection 相关路径
- **AND** 迁移 SHALL NOT 修改真实认证、授权、OAuth/OIDC、Provider、Gateway projection、密钥或生产/类生产配置行为

### Requirement: Organization sync pages migrate through shared TSX shell
Admin Web organization sync pages SHALL migrate from legacy JavaScript toward TS/TSX through small shared typed presentation components, without requiring a whole-app migration or a full React rewrite.

#### Scenario: Shared organization sync components are TSX
- **WHEN** the implementation adds shared page header, action bar, status tag, provider logo, schedule, or run table presentation components for organization sync pages
- **THEN** those new React components SHALL be implemented as `.tsx`
- **AND** their prop contracts SHALL use explicit TypeScript types or interfaces rather than unexplained `any`

#### Scenario: Shared organization sync helpers are TS
- **WHEN** the implementation adds shared organization sync run status, impact count, provider logo, or API payload type helpers
- **THEN** those helpers SHALL be implemented as `.ts`
- **AND** they SHALL avoid coupling WeCom and Feishu backend APIs into one generic sync service abstraction

#### Scenario: Existing sync pages migrate conservatively
- **WHEN** `WecomOrganizationSyncPage` or `FeishuOrganizationSyncPage` is migrated to TSX
- **THEN** the migration SHALL preserve route exports, backend API calls, polling behavior, pagination, secret masking behavior, organization switching, and existing visible user workflows
- **AND** the migration SHALL NOT require rewriting unrelated legacy JS pages

#### Scenario: 飞书组织同步页面迁移
- **WHEN** `FeishuOrganizationSyncPage` is migrated to TSX
- **THEN** the migration SHALL preserve `/feishu-org-sync` routing, configuration form behavior, connection test behavior, dry-run preview/history, user binding conflict diagnostics, handoff evidence display/export, run polling, pagination, copy actions, and safe redaction behavior
- **AND** `FeishuOrganizationSyncBackend` SHOULD migrate to `.ts` with typed request/response contracts for the endpoints used by the page
- **AND** the main page test SHOULD migrate to `.test.tsx` without requiring real Feishu/Lark secrets or real Contact v3 calls
- **AND** the migration SHALL NOT change backend sync objects, API routes, scheduler semantics, provider credentials, or Gateway/Insight behavior

#### Scenario: TypeScript migration is validated
- **WHEN** the organization sync page migration is ready for review
- **THEN** `yarn typecheck`, the incremental TypeScript gate, focused Jest tests, and `yarn build` SHALL pass for the touched TS/TSX and coexistence paths
- **AND** any retained `.js` page or test file touched by the migration SHALL be justified by lower implementation risk or unchanged behavior scope

### Requirement: 组织账号群组树渐进迁移
`web-admin` SHALL 支持将组织账号下的群组树页面从 legacy JavaScript 迁移为 TSX，并保持现有 `/trees` 路由、群组树操作、组织切换和内嵌用户列表行为兼容。

#### Scenario: 群组树路由和导入保持兼容
- **WHEN** `GroupTreePage` 迁移为 `.tsx`
- **THEN** `ManagementPage.js` SHALL 继续通过现有 `./GroupTreePage` 路径导入页面
- **AND** `/trees/:organizationName` 和 `/trees/:organizationName/:groupName` SHALL 继续为已登录用户渲染同一页面

#### Scenario: 群组树数据读取保持兼容
- **WHEN** 页面加载或当前组织发生变化
- **THEN** 页面 SHALL 继续通过现有群组列表 API 边界读取数据，并传入 `withTree=true`
- **AND** 当接口没有返回树节点时 SHALL 展示现有空态
- **AND** 当接口返回非 `ok` 状态时 SHALL 保持现有错误提示行为

#### Scenario: 群组选择和内嵌用户列表保持兼容
- **WHEN** 操作员在树中选择一个群组节点
- **THEN** 页面 SHALL 更新选中群组状态并跳转到 `/trees/<organization>/<group>`
- **AND** 内嵌 `UserListPage` SHALL 接收当前 `organizationName` 和 `groupName`
- **AND** 清除选择时 SHALL 跳回 `/trees/<organization>`，并以无群组过滤的方式渲染内嵌用户列表

#### Scenario: 群组新增编辑删除行为保持兼容
- **WHEN** 操作员新增根群组、新增子群组、编辑选中群组或删除树中的叶子群组
- **THEN** 页面 SHALL 保持现有目标路由、session storage marker、群组默认值生成、后端调用、成功提示和错误提示
- **AND** 迁移 SHALL NOT 改变群组后端 API 的 payload shape

#### Scenario: 群组树迁移验证
- **WHEN** 群组树页面迁移准备进入 review
- **THEN** 增量 TypeScript gate、`yarn typecheck`、聚焦 `.test.tsx` 测试以及 `yarn build` 或等价导入边界验证 SHALL 通过
- **AND** 本迁移 SHALL NOT 要求同一 change 迁移 `GroupBackend.js`、`GroupListPage.js`、`GroupEditPage.js`、`UserListPage.js`、`UserEditPage.js`、`OrganizationListPage.js` 或其它组织账号页面

### Requirement: 组织账号用户列表渐进迁移
Admin 前端 SHALL 支持将组织账号菜单下的用户列表页渐进迁移为 TSX，并在不扩大到用户编辑、认证和账号安全链路的前提下保持现有用户列表行为兼容。

#### Scenario: 用户列表页迁移
- **WHEN** 后续 change 触碰组织账号菜单下的用户列表页
- **THEN** `UserListPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、用户记录、组织记录、默认用户模板、列表 fetch 参数、上传预览和表格列
- **AND** 迁移 SHALL 保持 `/users`、`/organizations/:organizationName/users` 和 `GroupTreePage` 内嵌用户列表的路由/调用方兼容
- **AND** 迁移 SHALL 保持当前组织筛选、全局/组织/群组 fetch、新增、删除、移出群组、冒充、上传预览、上传提交、下载模板、分页筛选排序、组织身份中心摘要和后端 API 契约
- **AND** `UserBackend.js` MAY 保持为 legacy JS，当迁移它会牵出无关的登录、验证码、MFA、密码、购物车、购买或用户编辑链路
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `UserBackend.js`、`UserEditPage`、`GroupTreePage`、`OrganizationEditPage` 或其它组织账号页面

#### Scenario: 用户列表迁移验证
- **WHEN** 身份源菜单或组织账号菜单的 React 组件迁移为 TSX
- **THEN** 增量 TypeScript 门禁、`yarn typecheck`、聚焦 Jest 测试以及 build 或等价导入边界验证 SHALL 对触碰的 TSX 与 JS 共存路径通过

### Requirement: 组织编辑页 TSX 迁移
`web-admin` SHALL allow `OrganizationEditPage` to migrate from JavaScript to TSX while preserving existing organization edit behavior, route exports, backend API contracts, and visible administrator workflows.

#### Scenario: 组织编辑页保守迁移
- **WHEN** `OrganizationEditPage` is migrated to `.tsx`
- **THEN** the migration SHALL preserve `/organizations/:organizationName` loading, save, save-and-exit, cancel, delete, theme update, organization name lock, LDAP/MFA/navigation/theme sections, and transaction list behavior
- **AND** the migration SHALL NOT require rewriting organization backend APIs, other organization account pages, authentication, authorization, provider, or Gateway behavior

#### Scenario: 组织编辑页迁移验证
- **WHEN** the organization edit page TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused React tests, changed-file coverage, and `yarn build` or equivalent build validation SHALL pass for the touched TSX and JS coexistence paths
- **AND** React tests for migrated page behavior SHALL use `.test.tsx`

### Requirement: 用户编辑页 TSX 迁移
`web-admin` SHALL allow `UserEditPage` to migrate from JavaScript to TSX while preserving existing user edit behavior, route exports, account-page embedding, backend API contracts, and visible administrator or self-service workflows.

#### Scenario: 用户编辑页保守迁移
- **WHEN** `UserEditPage` is migrated to `.tsx`
- **THEN** the migration SHALL preserve `/users/:organizationName/:userName` loading, account page embedding, save, save-and-exit, cancel/delete, return URL handling, user list URL handling, 404 handling, group visibility, MFA/account security sections, third-party identity widgets, and transaction display behavior
- **AND** the migration SHALL NOT require rewriting user backend APIs, authentication, authorization, provider, Gateway, modal, table, or OAuth/SAML widget behavior

#### Scenario: 用户编辑页迁移验证
- **WHEN** the user edit page TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused React tests, changed-file coverage, and `yarn build` or equivalent build validation SHALL pass for the touched TSX and JS coexistence paths
- **AND** React tests for migrated page behavior SHALL use `.test.tsx`

### Requirement: 组织树运营页保守迁移
Admin Web 组织账号菜单下的组织树运营页迁移 SHALL 使用增量 TSX/TS 方式保留既有运行时行为，并把页面、专用 API wrapper 和对应 React 测试纳入 TypeScript 验证链路。

#### Scenario: 页面迁移保持组织树运营行为
- **WHEN** `OrganizationTreeOperationsPage` 被迁移为 `.tsx`
- **THEN** 迁移 SHALL 保持 `/organization-tree-operations` 路由入口、组织选择、诊断加载、筛选、树/表视图、刷新动作、部门成员分页抽屉、错误态和空态行为不变
- **AND** 迁移 SHALL NOT 修改组织树运营后端 API、权限、真实组织数据、文案或可见状态分类

#### Scenario: API wrapper 迁移为 TS
- **WHEN** `OrganizationTreeOperationsBackend` 被迁移为 `.ts`
- **THEN** 该 wrapper SHALL 保持原有 API path、HTTP method、query/body 参数、credential 和 `Accept-Language` header 行为不变
- **AND** 该 wrapper SHALL 导出页面或测试可复用的诊断和成员响应类型

#### Scenario: 组织树运营迁移验证
- **WHEN** 组织树运营页 TSX 迁移准备收口
- **THEN** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` SHALL pass for touched TS/TSX and coexistence paths

### Requirement: 组织目录质量页保守迁移
Admin Web 组织账号菜单下的目录质量页迁移 SHALL 使用增量 TSX 方式保留既有目录质量诊断、修复预览和只读审计行为，并把页面和对应 React 测试纳入 TypeScript 验证链路。

#### Scenario: 页面迁移保持目录质量行为
- **WHEN** `OrganizationDirectoryQualityPage` 被迁移为 `.tsx`
- **THEN** 迁移 SHALL 保持 `/organization-directory-quality` 路由入口、组织选择、实体类型筛选、质量状态筛选、原因筛选、生命周期筛选、列表分页、导出、详情 Drawer、错误态和空态行为不变
- **AND** 迁移 SHALL NOT 修改目录质量后端 API、权限、真实组织数据、文案或可见状态分类

#### Scenario: 局部类型覆盖目录质量响应
- **WHEN** 页面调用 `PlatformApiMappingBackend` 中的目录质量和修复预览接口
- **THEN** 页面 SHALL 使用局部 TypeScript 类型描述列表项、摘要、修复计划、action draft、preflight、审批预览、审计、operator note readiness、筛选和分页状态
- **AND** 本迁移 SHALL NOT 要求同一 change 迁移共享 `PlatformApiMappingBackend.js`

#### Scenario: 目录质量迁移验证
- **WHEN** 目录质量页 TSX 迁移准备收口
- **THEN** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` SHALL pass for touched TSX and JS coexistence paths

### Requirement: 群组编辑页保守迁移
Admin Web 组织账号菜单下的群组编辑页迁移 SHALL 使用增量 TSX 方式保留既有群组加载、编辑、保存、取消和删除行为，并把页面和对应 React 测试纳入 TypeScript 验证链路。

#### Scenario: 页面迁移保持群组编辑行为
- **WHEN** `GroupEditPage` 被迁移为 `.tsx`
- **THEN** 迁移 SHALL 保持 `/groups/:organizationName/:groupName` 路由入口、群组加载、组织加载、群组列表加载、组织选择、名称编辑、显示名编辑、类型选择、父群组选项、用户标签展示、启用开关、保存、保存并退出、取消新增和删除行为不变
- **AND** 迁移 SHALL 保持现有 `groupTreeUrl` session storage 返回逻辑、成功/错误提示和 404/空数据处理语义
- **AND** 迁移 SHALL NOT 修改群组后端 API、权限、真实组织数据、文案或可见状态分类

#### Scenario: 局部类型覆盖群组编辑响应
- **WHEN** 页面调用 `GroupBackend` 和 `OrganizationBackend` 中的群组编辑相关接口
- **THEN** 页面 SHALL 使用局部 TypeScript 类型描述 props、route params、state、群组记录、组织记录、选择项和 API response
- **AND** 本迁移 SHALL NOT 要求同一 change 迁移 `InvitationEditPage`、`SyncerEditPage`、`ManagementPage` 或其它组织账号/身份源页面

#### Scenario: 群组编辑迁移验证
- **WHEN** 群组编辑页 TSX 迁移准备收口
- **THEN** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` SHALL pass for touched TSX and JS coexistence paths

### Requirement: 权限角色 Casbin 模型页渐进迁移
`web-admin` SHALL support migrating the Authorization menu Casbin model pages from legacy JavaScript to TSX while preserving existing model list, model edit, route, permission, API, and Casbin model text behavior.

#### Scenario: Casbin 模型页面路由和导入保持兼容
- **WHEN** `ModelListPage`, `ModelEditPage`, and `CasbinEditor` are migrated to `.tsx`
- **THEN** `ManagementPage.js` SHALL continue importing `./ModelListPage` and `./ModelEditPage` through the existing extensionless paths
- **AND** `/models` SHALL continue rendering the model list for logged-in users
- **AND** `/models/:organizationName/:modelName` SHALL continue rendering the model edit page for logged-in users

#### Scenario: Casbin 模型列表行为保持兼容
- **WHEN** an operator opens the model list, searches, sorts, adds, edits, previews, or deletes a model
- **THEN** the page SHALL continue using the existing `ModelBackend` API boundary and request parameters
- **AND** the page SHALL preserve existing table columns, pagination, built-in object delete protection, success/error messages, and edit route targets
- **AND** the migration SHALL NOT change model create/delete payload shape or permission behavior

#### Scenario: Casbin 模型编辑行为保持兼容
- **WHEN** an operator opens, edits, saves, saves and exits, or cancels a newly added model
- **THEN** the page SHALL preserve current model loading, organization loading, field editing, `modelText` editing, save/delete backend calls, success/error messages, and navigation behavior
- **AND** the migration SHALL NOT change Casbin model save semantics, backend API routes, or built-in model read-only rules

#### Scenario: Casbin editor tab synchronization remains compatible
- **WHEN** an operator switches between Basic Editor and Advanced Editor
- **THEN** `CasbinEditor` SHALL preserve current local `modelText` state, iframe `getModelText` / `updateModelText` synchronization, and `onModelTextChange` callback behavior
- **AND** built-in models SHALL remain read-only in the Basic Editor and SHALL NOT call the model text change callback

#### Scenario: Casbin 模型页迁移验证
- **WHEN** the Casbin model TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused `.test.tsx` tests, changed-file or changed-function coverage, and `yarn build` or equivalent import-boundary validation SHALL pass for the touched TSX and JS coexistence paths
- **AND** this migration SHALL NOT require the same change to migrate Role, Permission, Identity Evidence, Adapter, Enforcer, PolicyTable, backend API wrappers, or unrelated Authorization menu pages

### Requirement: 应用接入二级菜单页面渐进迁移
Admin 前端 SHALL 支持将“应用接入”一级菜单下的二级菜单落地页按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、权限、接口、文案、页面行为、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 应用接入二级菜单落地页迁移
- **WHEN** 开发者迁移“应用接入”一级菜单下的二级菜单落地页
- **THEN** `/applications`、`/resources`、`/certs`、`/keys`、`/platform-api-mappings`、`/webhooks`、`/webhook-events` 对应页面 SHOULD 使用 `.tsx`
- **AND** 已经是 TSX 的 `/access-wizard` 页面 SHALL 保持现有 TSX 路由和行为
- **AND** 迁移 SHALL NOT 要求同一 change 迁移应用、证书、密钥或 Webhook 编辑页

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 应用接入二级菜单页面迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、菜单 key、权限可见性、分页、筛选、排序、表格列、操作按钮和后端 API 调用契约
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Provider、Gateway projection、真实密钥、生产配置或类生产配置
- **AND** 页面 SHALL NOT 新增展示 client secret、token、Webhook secret、私有回调 payload 或其它敏感字段原值

#### Scenario: 迁移测试和验证
- **WHEN** 应用接入二级菜单页面迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象

### Requirement: 邀请码编辑页保守迁移
Admin Web 组织账号菜单下的邀请码编辑页迁移 SHALL 使用增量 TSX 方式保留既有邀请码加载、编辑、复制链接、发送邀请、保存、取消和删除行为，并把页面和对应 React 测试纳入 TypeScript 验证链路。

#### Scenario: 页面迁移保持邀请码编辑行为
- **WHEN** `InvitationEditPage` 被迁移为 `.tsx`
- **THEN** 迁移 SHALL 保持 `/invitations/:organizationName/:invitationName` 路由入口、邀请码加载、组织加载、应用加载、群组加载、组织选择、名称编辑、显示名编辑、邀请码和默认码编辑、复制注册链接、发送邀请邮件、配额编辑、已使用数量编辑、应用选择、注册群组选择、用户名/邮箱/手机号编辑、状态选择、保存、保存并退出、取消新增和删除行为不变
- **AND** 迁移 SHALL 保持成功/错误提示、404/空数据处理语义和发送邀请 Modal 状态语义
- **AND** 迁移 SHALL NOT 修改邀请码后端 API、权限、真实组织数据、文案或可见状态分类

#### Scenario: 局部类型覆盖邀请码编辑响应
- **WHEN** 页面调用 `InvitationBackend`、`OrganizationBackend`、`ApplicationBackend` 和 `GroupBackend` 中的邀请码编辑相关接口
- **THEN** 页面 SHALL 使用局部 TypeScript 类型描述 props、route params、state、邀请码记录、组织记录、应用记录、群组记录、选择项和 API response
- **AND** 本迁移 SHALL NOT 要求同一 change 迁移 `InvitationBackend`、`InvitationListPage`、`SignupPage`、`ManagementPage` 或其它组织账号/身份源页面

#### Scenario: 邀请码编辑迁移验证
- **WHEN** 邀请码编辑页 TSX 迁移准备收口
- **THEN** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` SHALL pass for touched TSX and JS coexistence paths

### Requirement: 管理工具菜单页面渐进迁移
Admin 前端 SHALL 支持将“管理工具”一级菜单下的系统信息、表单和工单页面按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、权限、接口、文案、页面行为、动态表单字段逻辑和 JS/TS 共存边界兼容。

#### Scenario: 管理工具 React 页面迁移
- **WHEN** 开发者迁移“管理工具”一级菜单下的 React 页面
- **THEN** `/sysinfo`、`/forms`、`/forms/:formName`、`/tickets`、`/tickets/:organizationName/:ticketName` 对应页面 SHALL 使用 `.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `FormBackend`、`TicketBackend`、`SystemInfo` backend client、`BaseListPage`、`FormItemTable`、`PrometheusInfoTable`、`ToolTable`、`Setting` 或其它动态表单使用方

#### Scenario: API 文档外链保持不变
- **WHEN** 管理工具菜单页面迁移为 TSX
- **THEN** `/swagger` SHALL 保持为现有 `enterpriseNavigation` 配置承载的外部导航入口
- **AND** 迁移 SHALL NOT 为 API 文档创建新的 React 页面或路由实现
- **AND** `/swagger` 的本地和非本地 URL 计算 SHALL 保持现有 `Setting.isLocalhost()` 分支行为

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 管理工具页面迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、菜单 key、权限可见性、分页、筛选、排序、表格列、操作按钮、轮询清理、表单预览、工单消息和后端 API 调用契约
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Gateway、真实密钥、生产配置或类生产配置
- **AND** 页面 SHALL NOT 新增展示 token、secret、Cookie、私有 URL 或其它敏感字段原值

#### Scenario: 迁移测试和验证
- **WHEN** 管理工具页面迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象

### Requirement: 商业付款商品目录页面渐进迁移
Admin 前端 SHALL 支持将“商业付款”一级菜单下的商品商店、商品列表、商品编辑和商品目录共用控件按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、菜单、权限、接口、文案、商品展示、加购入口、编辑保存、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 商品目录 React 页面和控件迁移
- **WHEN** 开发者迁移“商业付款”一级菜单下的商品目录类 React 页面和控件
- **THEN** `/product-store`、`/products`、`/products/:organizationName/:productName` 对应页面 SHALL 使用 `.tsx`
- **AND** `common/product/CartControls` SHALL 使用 `.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `ProductBuyPage`、`CartListPage`、订单、付款、计划、定价、订阅、交易、支付结果、公开购买页、`ProductBackend`、payment provider 或真实支付链路

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 商品目录页面迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、`enterpriseNavigation` 菜单 key、权限可见性、商品列表分页筛选排序、商品商店加载、数量选择、加入购物车入口、立即购买入口、商品编辑保存、删除/取消和后端 API 调用契约
- **AND** 迁移 SHALL 保持 `ProductBuyPage.js`、`CartListPage.js` 等 legacy JS 调用方对 `CartControls` 和商品数据的现有调用兼容
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Gateway、真实密钥、生产配置、订单创建、支付跳转、支付结果或 provider credential 行为
- **AND** 页面 SHALL NOT 新增展示 token、secret、Cookie、私有 URL、支付凭据或其它敏感字段原值

#### Scenario: 迁移测试和验证
- **WHEN** 商品目录页面迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象

### Requirement: 商业付款购买与购物车页面渐进迁移
Admin 前端 SHALL 支持将“商业付款”一级菜单下的商品购买页和购物车页按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、菜单、权限、接口、文案、购物车持久化、订单创建入口、支付跳转入口、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 购买与购物车 React 页面迁移
- **WHEN** 开发者迁移“商业付款”一级菜单下的商品购买和购物车 React 页面
- **THEN** `/products/:organizationName/:productName/buy` 对应页面 SHALL 使用 `.tsx`
- **AND** `/cart` 对应页面 SHALL 使用 `.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `Order*Page`、`Payment*Page`、`Plan*Page`、`Pricing*Page`、`Subscription*Page`、`Transaction*Page`、`ProductBackend`、`OrderBackend`、`PaymentBackend`、payment provider 或真实支付链路

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 商品购买页和购物车页迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、`enterpriseNavigation` 菜单 key、权限可见性、商品/pricing/plan 加载、充值金额选择、数量控制、加入购物车、购物车计数、购物车商品补齐、无效项提示、删除/清空、数量更新、总价展示、创建订单入口和支付跳转入口
- **AND** 迁移 SHALL 保持 `ProductBackend`、`PlanBackend`、`PricingBackend`、`OrderBackend`、`UserBackend`、`BaseListPage` 和 `Setting` 的既有调用契约
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Gateway、真实密钥、生产配置、订单创建语义、支付 provider、支付回调、支付结果确认或订阅状态流转
- **AND** 页面 SHALL NOT 新增展示 token、secret、Cookie、私有 URL、支付凭据或其它敏感字段原值

#### Scenario: 迁移测试和验证
- **WHEN** 购买与购物车页面迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
- **AND** 测试 SHALL 只 mock 订单创建和支付跳转入口，不调用真实 payment provider、真实订单支付或真实外部租户环境

### Requirement: 商业付款订单链路页面渐进迁移
Admin 前端 SHALL 支持将“商业付款”一级菜单下的订单列表页、订单编辑页和订单支付页按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、菜单、权限、接口、文案、订单状态展示、订单维护入口、支付发起入口、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 订单 React 页面迁移
- **WHEN** 开发者迁移“商业付款”一级菜单下的订单链路 React 页面
- **THEN** `/orders` 对应页面 SHALL 使用 `.tsx`
- **AND** `/orders/:organizationName/:orderName` 对应页面 SHALL 使用 `.tsx`
- **AND** `/orders/:organizationName/:orderName/pay` 对应页面 SHALL 使用 `.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `Payment*Page`、`Plan*Page`、`Pricing*Page`、`Subscription*Page`、`Transaction*Page`、`OrderBackend`、`PaymentBackend`、payment provider、真实支付结果确认或真实支付回调

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 订单列表、编辑和支付页面迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、`enterpriseNavigation` 菜单 key、权限可见性、订单分页筛选排序、产品摘要、价格链接、用户链接、状态提示、新增订单、取消订单、删除订单、编辑/查看订单、保存、保存并退出、取消新增、订单和商品加载、支付环境判断、支付渠道展示、支付按钮、二维码支付跳转、WeChat JSAPI 调用入口和错误提示
- **AND** 迁移 SHALL 保持 `OrderBackend`、`ProductBackend`、`UserBackend`、`PaymentBackend`、`BaseListPage`、`PaginateSelect` 和 `Setting` 的既有调用契约
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Gateway、真实密钥、生产配置、订单创建语义、支付 provider、支付回调、支付结果确认或订阅状态流转
- **AND** 页面 SHALL NOT 新增展示 token、secret、Cookie、私有 URL、支付凭据或其它敏感字段原值

#### Scenario: 迁移测试和验证
- **WHEN** 订单链路页面迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
- **AND** 测试 SHALL 只 mock 订单维护、支付发起和支付跳转入口，不调用真实 payment provider、真实订单支付、真实支付回调或真实外部租户环境

### Requirement: 权限角色角色权限列表页渐进迁移
`web-admin` SHALL support migrating the Authorization menu role and permission list pages from legacy JavaScript to TSX while preserving existing list, route, permission, API, upload, and table operation behavior.

#### Scenario: 角色权限列表路由和导入保持兼容
- **WHEN** `RoleListPage` and `PermissionListPage` are migrated to `.tsx`
- **THEN** `ManagementPage.js` SHALL continue importing `./RoleListPage` and `./PermissionListPage` through the existing extensionless paths
- **AND** `/roles` SHALL continue rendering the role list for logged-in users
- **AND** `/permissions` SHALL continue rendering the permission list for logged-in users

#### Scenario: 角色列表行为保持兼容
- **WHEN** an operator opens the role list, searches, sorts, adds, edits, downloads the template, previews upload data, uploads, or deletes a role
- **THEN** the page SHALL continue using the existing `RoleBackend` API boundary and request parameters
- **AND** the page SHALL preserve existing table columns, pagination, organization scope, upload endpoint, success/error messages, delete refresh behavior, and edit route targets
- **AND** the migration SHALL NOT change role create/delete payload shape or permission behavior

#### Scenario: 权限列表行为保持兼容
- **WHEN** an operator opens the permission list, searches, sorts, adds, edits, downloads the template, previews upload data, uploads, or deletes a permission
- **THEN** the page SHALL continue using the existing `PermissionBackend` API boundary and request parameters
- **AND** local admin users SHALL continue using `getPermissions`, while non-local-admin users SHALL continue using `getPermissionsBySubmitter`
- **AND** the page SHALL preserve existing table columns, pagination, organization scope, upload endpoint, state/effect rendering, success/error messages, delete refresh behavior, and edit route targets
- **AND** the migration SHALL NOT change permission create/delete payload shape, approval state semantics, or permission behavior

#### Scenario: 角色权限列表迁移验证
- **WHEN** the role and permission list TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused `.test.tsx` tests, changed-file or changed-function coverage, and `yarn build` or equivalent import-boundary validation SHALL pass for the touched TSX and JS coexistence paths
- **AND** this migration SHALL NOT require the same change to migrate Role edit, Permission edit, Identity Evidence, Casbin Model, Adapter, Enforcer, PolicyTable, backend API wrappers, or unrelated Authorization menu pages

### Requirement: 权限角色角色权限编辑页渐进迁移
`web-admin` SHALL support migrating the Authorization menu role and permission edit pages from legacy JavaScript to TSX while preserving existing edit, route, permission, API, validation, approval, and navigation behavior.

#### Scenario: 角色权限编辑页路由和导入保持兼容
- **WHEN** `RoleEditPage` and `PermissionEditPage` are migrated to `.tsx`
- **THEN** `ManagementPage.js` SHALL continue importing `./RoleEditPage` and `./PermissionEditPage` through the existing extensionless paths
- **AND** `/roles/:organizationName/:roleName` SHALL continue rendering the role edit page for logged-in users
- **AND** `/permissions/:organizationName/:permissionName` SHALL continue rendering the permission edit page for logged-in users

#### Scenario: 角色编辑行为保持兼容
- **WHEN** an operator opens, edits, saves, saves and exits, cancels a new role, or deletes a role
- **THEN** the page SHALL continue using the existing `RoleBackend` API boundary and request parameters
- **AND** the page SHALL preserve current role loading, organization selection, sub user/group/role/domain editing, enabled toggle, success/error messages, save payload shape, delete behavior, and navigation targets
- **AND** the migration SHALL NOT change role permission behavior or require role list migration in the same change

#### Scenario: 权限编辑行为保持兼容
- **WHEN** an operator opens, edits, saves, saves and exits, cancels a new permission, or deletes a permission
- **THEN** the page SHALL continue using the existing `PermissionBackend`, `ModelBackend`, and `ApplicationBackend` API boundaries and request parameters
- **AND** the page SHALL preserve current permission loading, model loading, Application resource loading, organization selection, model/resource/action/effect/state editing, submitter/approver/approveTime display, success/error messages, save payload shape, delete behavior, and navigation targets
- **AND** local admin users SHALL continue being able to change approval state, while non-local-admin users SHALL keep the existing submitter self-modification restriction
- **AND** the migration SHALL NOT change approval state semantics, permission validation semantics, or permission behavior

#### Scenario: 角色权限编辑页迁移验证
- **WHEN** the role and permission edit TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused `.test.tsx` tests, changed-file or changed-function coverage, and `yarn build` or equivalent import-boundary validation SHALL pass for the touched TSX and JS coexistence paths
- **AND** this migration SHALL NOT require the same change to migrate Role list, Permission list, Identity Evidence, Casbin Model, Adapter, Enforcer, PolicyTable, backend API wrappers, or unrelated Authorization menu pages

### Requirement: 商业付款支付结果与付款记录页面渐进迁移
Admin 前端 SHALL 支持将“商业付款”一级菜单下的支付结果页、付款记录列表页和付款记录编辑页按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、菜单、权限、接口、文案、支付状态展示、付款维护入口、发票动作入口、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 付款 React 页面迁移
- **WHEN** 开发者迁移“商业付款”一级菜单下的支付结果与付款记录 React 页面
- **THEN** `/payments/:organizationName/:paymentName/result` 对应页面 SHALL 使用 `.tsx`
- **AND** `/payments` 对应页面 SHALL 使用 `.tsx`
- **AND** `/payments/:organizationName/:paymentName` 对应页面 SHALL 使用 `.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `Plan*Page`、`Pricing*Page`、`Subscription*Page`、`Transaction*Page`、`PaymentBackend`、`PricingBackend`、`SubscriptionBackend`、`UserBackend`、`BaseListPage`、`Provider`、payment provider、真实支付通知、真实支付结果确认、真实支付回调或真实开票

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 支付结果页、付款记录列表页和付款记录编辑页迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、`enterpriseNavigation` 菜单 key、权限可见性、付款分页筛选排序、产品摘要、provider 链接、用户链接、价格展示、状态提示、结果页入口、新增付款、删除付款、编辑/查看付款、保存、保存并退出、发票字段校验、开票确认弹窗、开票接口入口、发票下载入口、支付结果状态渲染、结果页轮询入口、`notifyPayment` 调用条件、订阅 pricing/subscription 加载、订单跳转和错误提示
- **AND** 迁移 SHALL 保持 `PaymentBackend`、`PricingBackend`、`SubscriptionBackend`、`UserBackend`、`BaseListPage`、`Provider` 和 `Setting` 的既有调用契约
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Gateway、真实密钥、生产配置、支付 provider、支付通知、支付回调、支付结果确认、真实开票、发票校验语义或订阅状态流转
- **AND** 迁移 SHALL 保持既有发票字段展示行为不变
- **AND** 测试和验证记录 SHALL NOT 写入 token、secret、Cookie、私有 URL、支付凭据、个人证件、个人邮箱、手机号或其它敏感字段原值

#### Scenario: 迁移测试和验证
- **WHEN** 支付结果与付款记录页面迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
- **AND** 测试 SHALL 只 mock 支付结果查询、支付通知入口、付款维护、发票动作和跳转入口，不调用真实 payment provider、真实订单支付、真实支付通知、真实支付回调、真实开票或真实外部租户环境

### Requirement: 权限角色 Casbin 适配器页渐进迁移
`web-admin` SHALL support migrating the Authorization menu Casbin adapter pages from legacy JavaScript to TSX while preserving existing adapter list, adapter edit, route, permission, API, database connection test, and navigation behavior.

#### Scenario: Casbin 适配器页面路由和导入保持兼容
- **WHEN** `AdapterListPage` and `AdapterEditPage` are migrated to `.tsx`
- **THEN** `ManagementPage.js` SHALL continue importing `./AdapterListPage` and `./AdapterEditPage` through the existing extensionless paths
- **AND** `/adapters` SHALL continue rendering the adapter list for logged-in users
- **AND** `/adapters/:organizationName/:adapterName` SHALL continue rendering the adapter edit page for logged-in users

#### Scenario: Casbin 适配器列表行为保持兼容
- **WHEN** an operator opens the adapter list, searches, filters, sorts, adds, edits, or deletes an adapter
- **THEN** the page SHALL continue using the existing `AdapterBackend` API boundary and request parameters
- **AND** the page SHALL preserve existing table columns, pagination, built-in object delete protection, success/error messages, edit route targets, and delete refresh behavior
- **AND** the migration SHALL NOT change adapter create/delete payload shape or permission behavior

#### Scenario: Casbin 适配器编辑行为保持兼容
- **WHEN** an operator opens, edits, saves, saves and exits, cancels a newly added adapter, or deletes an adapter
- **THEN** the page SHALL preserve current adapter loading, organization loading, field editing, `useSameDb` switch behavior, save/delete backend calls, success/error messages, and navigation behavior
- **AND** the migration SHALL NOT change adapter save semantics, backend API routes, built-in object read-only rules, or visible adapter field labels

#### Scenario: 数据库连接测试行为保持兼容
- **WHEN** an operator runs the adapter database connection test
- **THEN** the page SHALL continue calling the existing `AdapterBackend.getPolicies` database probe boundary with the current adapter id
- **AND** success, backend error, and network error messages SHALL preserve the existing user-visible behavior
- **AND** the database connection test SHALL remain disabled when the route organization does not match the adapter owner

#### Scenario: Casbin 适配器页迁移验证
- **WHEN** the Casbin adapter TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused `.test.tsx` tests, changed-file or changed-function coverage, and `yarn build` or equivalent import-boundary validation SHALL pass for the touched TSX and JS coexistence paths
- **AND** this migration SHALL NOT require the same change to migrate Role, Permission, Identity Evidence, Casbin Model, Enforcer, PolicyTable, backend API wrappers, or unrelated Authorization menu pages

### Requirement: 权限角色 Casbin 执行器迁移评估与拆分
`web-admin` SHALL assess the Authorization menu Casbin enforcer pages and `PolicyTable` before migrating them from legacy JavaScript to TSX, and SHALL split subsequent migration work by risk boundary instead of treating all enforcer-related files as one ordinary page migration.

#### Scenario: 执行器列表页可作为独立迁移候选
- **WHEN** a later change migrates `EnforcerListPage` to `.tsx`
- **THEN** the migration SHALL preserve `/enforcers` routing, extensionless `ManagementPage.js` import, list fetch parameters, table columns, pagination, search, sort, add, edit, delete, built-in object protection, success/error messages, and delete refresh behavior
- **AND** the migration SHALL NOT require the same change to migrate `EnforcerEditPage`, `PolicyTable`, `AdapterBackend`, `EnforcerBackend`, model pages, adapter pages, role/permission pages, or unrelated Authorization menu pages

#### Scenario: 执行器编辑页和策略表必须共同设计
- **WHEN** a later change migrates `EnforcerEditPage` or `PolicyTable` to TypeScript
- **THEN** that change SHALL explicitly cover the boundary between `EnforcerEditPage` and `PolicyTable`
- **AND** it SHALL preserve enforcer loading, organization/model/adapter loading, field editing, model and adapter selection, save/delete behavior, `modelCfg` delivery, and built-in object protection
- **AND** it SHALL preserve `PolicyTable` policy sync, dynamic policy columns, page-index mapping, add/edit/cancel/save/delete behavior, duplicate-policy handling, disabled states, and existing `AdapterBackend` policy API payload semantics

#### Scenario: 策略表迁移验证要求
- **WHEN** a later change migrates `PolicyTable` to TypeScript
- **THEN** focused `.test.tsx` tests SHALL cover policy sync success/error/network failure, dynamic columns from `modelCfg`, add row, edit row, cancel added row, update policy, add policy duplicate handling, remove policy, pagination index mapping, and disabled controls
- **AND** changed-file or changed-function coverage SHALL be recorded for the touched enforcer edit and policy table implementation files
- **AND** lower-level mock tests SHALL NOT be reported as real database or end-to-end policy execution verification

#### Scenario: 执行器迁移边界保持只读评估
- **WHEN** this assessment change is completed
- **THEN** it SHALL NOT modify production JavaScript/TypeScript source files, backend APIs, route definitions, authorization behavior, real policy data, credentials, or environment configuration
- **AND** it SHALL produce OpenSpec evidence that guides the next migration candidate without pushing or merging `test`

### Requirement: 权限角色 Casbin 执行器列表页渐进迁移
`web-admin` SHALL support migrating the Authorization menu Casbin enforcer list page from legacy JavaScript to TSX while preserving existing enforcer list, route, permission, API, and deletion-protection behavior.

#### Scenario: Casbin 执行器列表页路由和导入保持兼容
- **WHEN** `EnforcerListPage` is migrated to `.tsx`
- **THEN** `ManagementPage.js` SHALL continue importing `./EnforcerListPage` through the existing extensionless path
- **AND** `/enforcers` SHALL continue rendering the enforcer list for logged-in users
- **AND** `/enforcers/:organizationName/:enforcerName` SHALL continue to be owned by `EnforcerEditPage` outside this change

#### Scenario: Casbin 执行器列表行为保持兼容
- **WHEN** an operator opens the enforcer list, searches, sorts, adds, edits, or deletes an enforcer
- **THEN** the page SHALL continue using the existing `EnforcerBackend` API boundary and request parameters
- **AND** the page SHALL preserve existing table columns, pagination, built-in object delete protection, success/error messages, and edit route targets
- **AND** the migration SHALL NOT change enforcer create/delete payload shape or permission behavior

#### Scenario: Casbin 执行器列表 owner filtering remains compatible
- **WHEN** the default organization is selected
- **THEN** the list request SHALL continue sending an empty owner filter to `getEnforcers`
- **AND** when a specific organization is selected, the request SHALL continue sending `Setting.getRequestOrganization(account)` as the owner filter

#### Scenario: Casbin 执行器列表页迁移边界
- **WHEN** this migration is implemented
- **THEN** it SHALL NOT migrate `EnforcerEditPage`, `PolicyTable`, `AdapterBackend`, `EnforcerBackend`, backend APIs, Casbin policy CRUD, Role pages, Permission pages, Model pages, Adapter pages, or unrelated Authorization menu pages

#### Scenario: Casbin 执行器列表页迁移验证
- **WHEN** the Casbin enforcer list TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused `.test.tsx` tests, changed-file or changed-function coverage, and `yarn build` or equivalent import-boundary validation SHALL pass for the touched TSX and JS coexistence paths

### Requirement: 权限角色 Casbin 执行器编辑页和策略表渐进迁移
`web-admin` SHALL support migrating the Authorization menu Casbin enforcer edit page and embedded policy table from legacy JavaScript to TSX while preserving existing enforcer edit, policy CRUD, route, permission, API, and disabled-state behavior.

#### Scenario: Casbin 执行器编辑页路由和导入保持兼容
- **WHEN** `EnforcerEditPage` and `PolicyTable` are migrated to `.tsx`
- **THEN** `ManagementPage.js` SHALL continue importing `./EnforcerEditPage` through the existing extensionless path
- **AND** `EnforcerEditPage` SHALL continue importing `./table/PolicyTable` through the existing extensionless path
- **AND** `/enforcers/:organizationName/:enforcerName` SHALL continue rendering the enforcer edit page for logged-in users

#### Scenario: Casbin 执行器编辑行为保持兼容
- **WHEN** an operator opens, edits, saves, saves and exits, or cancels a newly added enforcer
- **THEN** the page SHALL preserve current enforcer loading, organization/model/adapter loading, field editing, save/delete backend calls, success/error messages, navigation behavior, and save-failure name rollback
- **AND** the migration SHALL NOT change enforcer save/delete payload shape, backend API routes, permission behavior, or built-in object read-only rules

#### Scenario: PolicyTable policy sync and dynamic columns remain compatible
- **WHEN** an operator syncs policies for an editable enforcer with model and adapter selected
- **THEN** `PolicyTable` SHALL continue using `AdapterBackend.getPolicies(enforcer.owner, enforcer.name)` and assigning stable row keys from the returned policy order
- **AND** policy columns SHALL continue deriving rule columns from `modelCfg["p"].split(",")` while retaining `Ptype` and action columns

#### Scenario: PolicyTable policy edit state remains compatible
- **WHEN** an operator edits, cancels, saves, adds, or deletes a policy row
- **THEN** `PolicyTable` SHALL preserve current pagination index mapping, `oldPolicy` rollback, add-vs-update selection, duplicate policy handling, success/error messages, and local table updates
- **AND** the migration SHALL NOT change `UpdatePolicy`, `AddPolicy`, `RemovePolicy`, or policy payload semantics

#### Scenario: PolicyTable disabled states remain compatible
- **WHEN** an edit is already active, the enforcer is built-in, or model/adapter is empty
- **THEN** `PolicyTable` SHALL continue disabling sync, add, edit, or delete controls according to the existing conditions

#### Scenario: Casbin 执行器编辑页迁移边界
- **WHEN** this migration is implemented
- **THEN** it SHALL NOT migrate `EnforcerListPage`, Role pages, Permission pages, Model pages, Adapter pages, backend API wrappers, backend APIs, or unrelated Authorization menu pages

#### Scenario: Casbin 执行器编辑页和策略表迁移验证
- **WHEN** the Casbin enforcer edit and policy table TSX migration is ready for review
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused `.test.tsx` tests, changed-file or changed-function coverage, and `yarn build` SHALL pass for the touched TSX and JS coexistence paths

### Requirement: 商业付款计划定价订阅页面渐进迁移
Admin 前端 SHALL 支持将“商业付款”一级菜单下的计划列表/编辑、定价列表/编辑、定价预览和订阅列表/编辑页面按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、菜单、权限、接口、文案、计划/定价/订阅维护入口、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 计划定价订阅 React 页面迁移
- **WHEN** 开发者迁移“商业付款”一级菜单下的计划、定价和订阅 React 页面
- **THEN** `/plans` 对应页面 SHALL 使用 `.tsx`
- **AND** `/plans/:organizationName/:planName` 对应页面 SHALL 使用 `.tsx`
- **AND** `/pricings` 对应页面 SHALL 使用 `.tsx`
- **AND** `/pricings/:organizationName/:pricingName` 对应页面 SHALL 使用 `.tsx`
- **AND** `pricing/PricingPage` 定价预览组件 SHALL 使用 `.tsx`
- **AND** `/subscriptions` 对应页面 SHALL 使用 `.tsx`
- **AND** `/subscriptions/:organizationName/:subscriptionName` 对应页面 SHALL 使用 `.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `Transaction*Page`、`TransactionTable*`、`PlanBackend`、`PricingBackend`、`SubscriptionBackend`、`ProductBackend`、`UserBackend`、`BaseListPage`、`Setting`、payment provider、真实订单创建、真实支付跳转、真实支付回调、真实支付结果确认或真实订阅状态流转

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 计划、定价和订阅页面迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、`enterpriseNavigation` 菜单 key、权限可见性、计划/定价/订阅分页筛选排序、新增、删除、编辑/查看、保存、保存并退出、取消新增、组织切换、关联 role/application/plan/pricing/user/payment 链接、价格/币种/周期/试用期/状态/启用开关展示、定价预览 URL 复制和定价预览展示
- **AND** 迁移 SHALL 保持 `PlanBackend`、`PricingBackend`、`SubscriptionBackend`、`ProductBackend`、`UserBackend`、`BaseListPage`、`PaginateSelect` 和 `Setting` 的既有调用契约
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Gateway、真实密钥、生产配置、订单创建语义、支付 provider、支付回调、支付结果确认、发票行为或订阅状态流转
- **AND** 测试和验证记录 SHALL NOT 写入 token、secret、Cookie、私有 URL、支付凭据、个人邮箱、手机号或其它敏感字段原值

#### Scenario: 迁移测试和验证
- **WHEN** 计划、定价和订阅页面迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
- **AND** 测试 SHALL 只 mock 计划、定价、订阅维护、预览 URL 复制和跳转入口，不调用真实 payment provider、真实订单支付、真实支付回调、真实订阅状态流转或真实外部租户环境

### Requirement: 商业付款交易页面渐进迁移
Admin 前端 SHALL 支持将“商业付款”一级菜单下的交易列表、交易编辑、交易表格和交易表格列定义按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有路由、菜单、权限、接口、文案、交易展示、充值入口、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 交易 React 页面和表格迁移
- **WHEN** 开发者迁移“商业付款”一级菜单下的交易页面和交易表格
- **THEN** `/transactions` 对应页面 SHALL 使用 `.tsx`
- **AND** `/transactions/:organizationName/:transactionName` 对应页面 SHALL 使用 `.tsx`
- **AND** `table/TransactionTable` SHALL 使用 `.tsx`
- **AND** `table/TransactionTableColumns` SHALL 使用 `.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `CartTable`、`TransactionBackend`、`OrganizationBackend`、`ApplicationBackend`、`UserBackend`、`BaseListPage`、`Setting`、payment provider、真实订单创建、真实支付跳转、真实支付回调、真实支付结果确认、真实订阅状态流转或真实交易入账语义

#### Scenario: 页面行为和运行边界保持不变
- **WHEN** 交易页面和交易表格迁移为 TSX
- **THEN** 迁移 SHALL 保持原有 `ManagementPage` 路由、`enterpriseNavigation` 菜单 key、权限可见性、交易分页筛选排序、新增、充值新增、删除、编辑/查看、保存、保存并退出、取消新增、组织切换、应用选择、用户选择、tag 切换、金额和币种维护、关联 organization/user/application/domain/type/subtype/provider/payment 链接、价格展示和内嵌交易表格展示
- **AND** 迁移 SHALL 保持 `TransactionBackend`、`OrganizationBackend`、`ApplicationBackend`、`UserBackend`、`BaseListPage`、`PaginateSelect` 和 `Setting` 的既有调用契约
- **AND** 迁移 SHALL NOT 修改认证/OIDC、Gateway、真实密钥、生产配置、订单创建语义、支付 provider、支付回调、支付结果确认、订阅状态流转或交易入账语义
- **AND** 测试和验证记录 SHALL NOT 写入 token、secret、Cookie、私有 URL、支付凭据、个人邮箱、手机号或其它敏感字段原值

#### Scenario: 交易迁移测试和验证
- **WHEN** 交易页面和交易表格迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
- **AND** 测试 SHALL 只 mock 交易列表、交易编辑、充值入口、交易列渲染和跳转入口，不调用真实 payment provider、真实订单支付、真实支付回调、真实订阅状态流转、真实交易入账或真实外部租户环境

### Requirement: 商业付款购物车表格渐进迁移
Admin 前端 SHALL 支持将商业付款购物车展示表格 `table/CartTable` 按渐进 TypeScript 路线迁移为 `.tsx`，并保持现有用户购物车展示、extensionless import、接口、文案、敏感信息脱敏和 JS/TS 共存边界兼容。

#### Scenario: 购物车表格组件迁移
- **WHEN** 开发者迁移商业付款购物车展示表格
- **THEN** `table/CartTable` SHALL 使用 `.tsx`
- **AND** `table/CartTable.js` SHALL NOT remain as the active React component
- **AND** `UserEditPage.tsx` SHALL continue importing `./table/CartTable` through the existing extensionless path
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `CartListPage`、`ProductBuyPage`、`UserEditPage`、`ProductBackend`、`OrderBackend`、`UserBackend`、`BaseListPage`、`Setting`、payment provider、真实购物车写入、真实订单创建、真实支付跳转、真实支付回调、真实支付结果确认或真实订阅状态流转

#### Scenario: 购物车表格展示行为保持不变
- **WHEN** `CartTable` 接收购物车条目
- **THEN** 迁移 SHALL 保持名称、图片链接、图片 alt、价格、币种符号、数量、详情和 row key 展示行为
- **AND** 当条目没有 `image` 时 SHALL continue rendering an empty image cell instead of a broken link or image
- **AND** 空购物车 SHALL continue rendering a valid AntD table with empty data
- **AND** 迁移 SHALL 保持 `Setting.getCurrencySymbol` 的既有调用契约

#### Scenario: 购物车表格迁移测试和验证
- **WHEN** 购物车表格迁移完成
- **THEN** 本次触碰且包含 JSX 的测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`
- **AND** 覆盖率记录 SHALL 以 touched production files 或等价受影响文件集合为统计对象
- **AND** 测试 SHALL 只 mock 购物车表格展示和货币符号，不调用真实 payment provider、真实订单支付、真实支付回调、真实订阅状态流转、真实购物车写入或真实外部环境

### Requirement: 商业付款 TypeScript 迁移路线收尾
Admin 前端 SHALL 为 Business & Payments 渐进 TypeScript 迁移提供收尾证据，证明菜单所属页面、页面级测试和路由所属共享表格组件已迁移到 `.ts` / `.tsx` / `.test.tsx`，并保留明确的 JS/TS 共存边界。

#### Scenario: 商业付款页面和共享组件无剩余 legacy React 文件
- **WHEN** 商业付款 TypeScript 迁移路线收尾
- **THEN** 收尾证据 SHALL 扫描 `Product`、`Cart`、`Order`、`Payment`、`Plan`、`Pricing`、`Subscription`、`Transaction` 页面、表格和页面级测试路径中剩余的 `.js` 或 `.jsx` React 文件
- **AND** 扫描结果 SHALL 表明没有仍需本路线迁移的 Business & Payments 菜单所属页面或路由所属共享表格组件
- **AND** 收尾证据 SHALL 列出当前覆盖这些页面和组件的 `.ts` / `.tsx` / `.test.tsx` 文件

#### Scenario: 保留 legacy JS 边界
- **WHEN** 收尾证据发现全局壳或 backend client JavaScript
- **THEN** `ManagementPage.js`、`EntryPage.js` 和 `enterpriseNavigation.js` SHALL 被视为本 Business & Payments 迁移路线之外的全局路由/导航壳
- **AND** `ProductBackend.js`、`OrderBackend.js`、`PaymentBackend.js`、`PlanBackend.js`、`PricingBackend.js`、`SubscriptionBackend.js`、`TransactionBackend.js`、`UserBackend.js`、`BaseListPage` 和 `Setting` SHALL 继续作为明确的 legacy 边界保留，除非后续 change 单独限定它们的迁移范围
- **AND** 收尾 SHALL NOT 修改 payment provider 行为、订单创建、支付跳转、回调处理、支付结果确认、订阅状态流转、购物车持久化、交易入账、凭据、生产配置、Gateway、OIDC 或认证行为

#### Scenario: closeout 验证
- **WHEN** the Business & Payments migration closeout is ready
- **THEN** OpenSpec changes/specs validation、`git diff --check`、增量 TypeScript gate、`yarn typecheck`、Business & Payments focused `.test.tsx` tests 和 `yarn build` SHALL 通过，或记录明确 blocker
- **AND** 验证记录 SHALL 不包含 token、secret、Cookie、私有 URL、支付凭据、个人邮箱、手机号或其它敏感字段原值

### Requirement: LLM AI/Gateway MCP Store 页面渐进迁移
Admin 前端 SHALL 支持将 LLM AI/Gateway 菜单下的 MCP Store 页面从 legacy JavaScript 渐进迁移为 TSX，并在不扩大到 MCP Server 管理或其它网关页面的前提下保持现有行为兼容。

#### Scenario: MCP Store 页面迁移
- **WHEN** 后续 change 触碰 `LLM AI/Gateway` 菜单下的 MCP Store 页面
- **THEN** `ServerStorePage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、线上 Server 原始响应、归一化目录项、标签筛选和创建 Server payload
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持 `/server-store` 路由、权限、接口、文案、目录加载、筛选、刷新、空态、加载态、创建 Server 和跳转行为不变
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `ServerBackend.js`、`ServerListPage.js`、`ServerEditPage.js`、入口配置、站点范围、治理规则、规则表格、应用接入、组织账号或权限角色页面

#### Scenario: MCP Store 迁移验证
- **WHEN** `ServerStorePage` 被迁移为 TSX
- **THEN** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 或等价导入边界验证 SHALL pass for touched TSX and JS coexistence paths
- **AND** 覆盖率证据 SHALL 以迁移后的 MCP Store 页面和对应测试为重点，不得用全仓平均覆盖率替代受影响文件覆盖率
### Requirement: LLM AI/Gateway MCP Server 页面渐进迁移
Admin 前端 SHALL 支持将 LLM AI/Gateway 菜单下的 MCP Server 页面从 legacy JavaScript 渐进迁移为 TSX，并在不扩大到 MCP Store、站点范围、治理规则或后端 wrapper 的前提下保持现有行为兼容。

#### Scenario: MCP Server 页面迁移
- **WHEN** 后续 change 触碰 `LLM AI/Gateway` 菜单下的 MCP Server 列表和编辑页面
- **THEN** `ServerListPage` 和 `ServerEditPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、Server 记录、Tool 记录、列表 fetch 参数、表格列、路由参数和编辑表单字段
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持 `/servers` 和 `/servers/:organizationName/:serverName` 路由、权限、接口、文案、Server 列表操作、MCP Store 跳转、编辑保存删除语义和页面行为不变
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `ServerBackend.js`、`ServerStorePage.js`、`ToolTable.js`、站点范围、治理规则、规则表格、应用接入、组织账号或权限角色页面

#### Scenario: MCP Server 迁移验证
- **WHEN** `ServerListPage` 和 `ServerEditPage` 被迁移为 TSX
- **THEN** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 或等价导入边界验证 SHALL pass for touched TSX and JS coexistence paths
- **AND** 覆盖率证据 SHALL 以迁移后的 MCP Server 页面和对应测试为重点，不得用全仓平均覆盖率替代受影响文件覆盖率

### Requirement: LLM AI/Gateway 站点范围页面渐进迁移
Admin 前端 SHALL 支持将 LLM AI/Gateway 菜单下的站点范围页面从 legacy JavaScript 渐进迁移为 TSX，并在不扩大到治理规则编辑器、MCP 页面或后端 wrapper 的前提下保持现有行为兼容。

#### Scenario: 站点范围页面迁移
- **WHEN** 后续 change 触碰 `LLM AI/Gateway` 菜单下的站点范围页面
- **THEN** `SiteListPage` 和 `SiteEditPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、Site 记录、Rule 记录、列表 fetch 参数、表格列、路由参数和编辑表单字段
- **AND** `RuleTable` SHOULD 迁移为 `.tsx` 并使用明确 props 类型描述规则来源、站点已选规则和 `onUpdateRules` 回调
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持 `/sites` 和 `/sites/:organizationName/:siteName` 路由、权限、接口、文案、站点列表操作、编辑保存语义、规则选择表格和页面行为不变
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `SiteBackend.js`、`RuleBackend.js`、`ApplicationBackend.js`、`ProviderBackend.js`、`CertBackend.js`、治理规则编辑器、MCP Server、MCP Store、应用接入、组织账号或权限角色页面

#### Scenario: 站点范围迁移验证
- **WHEN** `SiteListPage`、`SiteEditPage` 和 `RuleTable` 被迁移为 TSX
- **THEN** 增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build` 或等价导入边界验证 SHALL pass for touched TSX and JS coexistence paths
- **AND** 覆盖率证据 SHALL 以迁移后的站点范围页面、规则选择表格和对应测试为重点，不得用全仓平均覆盖率替代受影响文件覆盖率

### Requirement: LLM AI/Gateway 治理规则表达式表格渐进迁移
Admin 前端 SHALL 支持将 LLM AI/Gateway 治理规则表达式表格从 legacy JavaScript 渐进迁移为 TSX，并通过局部类型和聚焦测试证明迁移保持行为兼容。

#### Scenario: 表达式表格使用 TSX 和局部类型
- **WHEN** `WafRuleTable`、`IpRuleTable`、`UaRuleTable` 和 `IpRateRuleTable` 被迁移
- **THEN** 对应生产组件文件 SHALL 使用 `.tsx`
- **AND** 组件 props、state、规则行、字段 key、AntD 表格列和输入回调 SHALL 使用明确局部 TypeScript 类型
- **AND** 迁移 SHALL NOT use unexplained `any`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `RuleEditPage.js`、`CompoundRule.js`、`RuleBackend.js` 或 TypeScript 基建

#### Scenario: 表达式表格迁移测试和验证
- **WHEN** 治理规则表达式表格迁移准备收口
- **THEN** 对应 React 测试 SHALL 使用 `.test.tsx`
- **AND** 聚焦测试 SHALL 覆盖默认规则、restore、添加、删除、上下移动、字段更新、IP tags 拼接、UA blur trim 和 IP rate number/string 转换
- **AND** 增量 TypeScript gate、`yarn typecheck`、focused Jest coverage、`git diff --check` 和必要的 `yarn build` SHALL pass for touched TSX and JS coexistence paths
- **AND** 覆盖率记录 SHALL 以迁移后的四个表格组件为统计对象，不得用全仓平均覆盖率替代受影响文件覆盖率
