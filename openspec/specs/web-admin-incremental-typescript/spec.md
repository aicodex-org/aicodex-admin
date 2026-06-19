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

#### Scenario: 新增 React 组件
- **WHEN** 后续 change 为 `web-admin` 新增 React 组件
- **THEN** 该组件 SHALL 默认使用 `.tsx`
- **AND** 如果继续使用 `.js`，change 文档或代码 review 记录 SHALL 说明原因

#### Scenario: 新增共享逻辑或接口模型
- **WHEN** 后续 change 新增共享工具函数、接口模型、类型定义或前后端数据结构描述
- **THEN** 新文件 SHALL 默认使用 `.ts`
- **AND** 该文件 SHALL 避免无解释 `any`

#### Scenario: 渐进迁移历史 JS
- **WHEN** 后续需求触及既有 JS 文件且迁移成本可控
- **THEN** 开发者 MAY 将该文件渐进迁移为 `.ts` 或 `.tsx`
- **AND** 迁移 SHALL 保持原有运行时行为、路由、权限和接口契约兼容

#### Scenario: 身份源菜单低风险入口迁移
- **WHEN** 后续 change 触碰身份源菜单下低风险只读 React 区块，例如 `/providers` 中的身份源中心摘要区
- **THEN** 该区块 SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、输入数据和派生展示状态
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL NOT 要求同一 change 迁移承载它的历史 JS 列表页或无关编辑页

#### Scenario: 应用接入中心低风险入口迁移
- **WHEN** 后续 change 触碰“应用接入”菜单下低风险只读 React 区块，例如 `/applications` 中的 `ApplicationAccessCenter`
- **THEN** 该区块 SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、应用记录、Provider 绑定和派生展示状态
- **AND** 对应 React 测试 SHOULD 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持现有路由、权限、接口、文案、页面行为、链接和敏感信息脱敏逻辑
- **AND** 迁移 SHALL NOT 要求同一 change 迁移承载它的历史 JS 列表页、编辑页、资源、证书、密钥、API 网关映射或 Webhook 页面

#### Scenario: 组织同步密钥页面迁移
- **WHEN** 后续 change 触碰身份源菜单下的组织同步密钥页面
- **THEN** `OrganizationSyncApiKeyListPage` SHOULD 迁移为 `.tsx` 并使用明确类型描述 props、state、API Key 记录、草稿和操作响应
- **AND** `OrganizationSyncApiKeyBackend` SHOULD 迁移为 `.ts` 并导出页面可复用的请求/响应类型
- **AND** 迁移 SHALL 保持 `/organization-sync-api-keys` 路由、权限、表格列、创建/轮换/禁用/删除操作、一次性明文展示和后端 API 契约
- **AND** 迁移 SHALL NOT 要求归档或重写独立的 `add-organization-sync-api-keys` 功能 change

#### Scenario: 同步器列表页迁移
- **WHEN** 后续 change 触碰身份源菜单下的同步器列表页
- **THEN** `SyncerListPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、同步器记录、列表 fetch 参数和表格列
- **AND** `SyncerBackend` SHOULD 迁移为 `.ts` 并导出列表页可复用的同步器记录和响应类型
- **AND** 迁移 SHALL 保持 `/syncers` 路由、权限、组织筛选、表格列、分页筛选排序、新增、删除、运行同步和后端 API 契约
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `SyncerEditPage`、`SyncerTableColumnTable` 或同步器编辑表单

#### Scenario: 组织账号菜单邀请码列表迁移
- **WHEN** 后续 change 触碰组织账号菜单下的邀请码列表页
- **THEN** `InvitationListPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、邀请码记录、列表 fetch 参数和表格列
- **AND** `InvitationBackend` SHOULD 迁移为 `.ts` 并导出列表页和编辑页可复用的邀请码记录、发送目标和响应类型
- **AND** 迁移 SHALL 保持 `/invitations` 路由、权限、组织筛选、表格列、分页筛选排序、新增、删除和后端 API 契约
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `InvitationEditPage`、组织列表、群组列表、用户列表或其它组织账号页面

#### Scenario: 组织账号菜单群组列表迁移
- **WHEN** 后续 change 触碰组织账号菜单下的群组列表页
- **THEN** `GroupListPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、群组记录、上传预览、列表 fetch 参数和表格列
- **AND** `GroupBackend` SHOULD 迁移为 `.ts` 并导出列表页、树页和编辑页可复用的群组记录、mutation 和响应类型
- **AND** 迁移 SHALL 保持 `/groups` 路由、权限、组织筛选、表格列、分页筛选排序、新增、删除、下载模板、上传预览、上传 endpoint 和后端 API 契约
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `GroupTreePage`、`GroupEditPage`、`UserListPage`、组织列表、用户列表或其它组织账号页面

#### Scenario: 组织账号菜单组织列表迁移
- **WHEN** 后续 change 触碰组织账号菜单下的组织列表页
- **THEN** `OrganizationListPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、state、组织记录、默认组织模板、列表 fetch 参数和表格列
- **AND** `OrganizationBackend` SHOULD 迁移为 `.ts` 并导出列表页、编辑页、用户页、选择组件和登录页可复用的组织记录、mutation 和响应类型
- **AND** 迁移 SHALL 保持 `/organizations` 路由、权限、组织筛选、表格列、分页筛选排序、新增、删除、组织身份中心摘要、群组/用户/编辑跳转和后端 API 契约
- **AND** 迁移 SHALL NOT 要求同一 change 迁移 `OrganizationEditPage`、`OrganizationTreeOperationsPage`、`OrganizationDirectoryQualityPage`、`UserListPage`、`GroupTreePage` 或其它组织账号页面

#### Scenario: TypeScript migration is validated
- **WHEN** identity source menu or organization account menu React components are migrated to TSX
- **THEN** the incremental TypeScript gate, `yarn typecheck`, focused Jest tests, and build or equivalent import-boundary validation SHALL pass for the touched TSX and JS coexistence paths

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
