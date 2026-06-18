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

#### Scenario: TypeScript migration is validated
- **WHEN** the organization sync page migration is ready for review
- **THEN** `yarn typecheck`, the incremental TypeScript gate, focused Jest tests, and `yarn build` SHALL pass for the touched TS/TSX and coexistence paths
- **AND** any retained `.js` page or test file touched by the migration SHALL be justified by lower implementation risk or unchanged behavior scope
