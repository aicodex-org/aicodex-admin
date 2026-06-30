## ADDED Requirements

### Requirement: Admin root shell 与路由配置基础迁移
Admin 前端 SHALL 支持将 root shell、routing、config foundation 从 legacy JavaScript 渐进迁移为 `.ts` / `.tsx`，并保持现有登录守卫、路由、菜单、workspace tabs、设置 helper、service worker、i18n 初始化和列表基类行为兼容。

#### Scenario: root shell 文件迁移
- **WHEN** root shell / routing / config foundation 被迁移
- **THEN** `adminLoginRouting`、`Conf`、`enterpriseNavigation`、`i18n`、`serviceWorker` 和 `setupTests` SHALL 使用 `.ts` 或在包含 JSX 时使用 `.tsx`
- **AND** `index`、`App`、`ManagementPage`、`Setting` 和 `BaseListPage` SHALL 使用 `.tsx`
- **AND** `App.test`、`ManagementPage.test`、`ManagementPage.navigation.test` 和 `Setting.test` SHALL 使用 `.test.tsx`

#### Scenario: root shell 行为保持兼容
- **WHEN** root shell / routing / config foundation 被迁移为 TypeScript
- **THEN** 迁移 SHALL 保持现有路由 path、菜单 key、无后缀 import、登录守卫、workspace tabs、setting helper、service worker 注册、i18n 初始化、列表页分页筛选排序基础契约和测试 setup 行为不变
- **AND** 迁移 SHALL NOT 修改用户可见文案、locales、认证/登录/权限语义、后端 API 契约、Provider/Application/Syncer 编辑页、backend wrappers、shared UI primitives、auth 组件、basic/entry/account 批次文件或 `test` 分支

#### Scenario: root shell 迁移类型边界
- **WHEN** `App`、`ManagementPage`、`Setting` 或 `BaseListPage` 读取 props、state、route config、menu item、account、setting value、legacy page component 或第三方组件参数
- **THEN** 迁移 SHALL 使用局部 TypeScript interface/type 描述当前文件实际消费字段
- **AND** 对未迁移页面、历史动态字段、第三方库或全局配置的宽松断言 SHALL 保持在本文件局部 legacy boundary 内，不得扩散为新的全局宽松模型

#### Scenario: root shell 迁移验证
- **WHEN** root shell / routing / config foundation TS 迁移准备收口
- **THEN** OpenSpec target validation、`git diff --check`、`App.test.tsx`、`ManagementPage.test.tsx`、`ManagementPage.navigation.test.tsx`、`Setting.test.tsx`、`yarn typecheck`、增量 TypeScript gate 和 `yarn build` SHALL pass
- **AND** 聚焦 Jest SHALL 真实发现并运行测试 suite，`0 tests` SHALL NOT be accepted as validation evidence
