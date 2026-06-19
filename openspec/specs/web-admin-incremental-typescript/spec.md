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
