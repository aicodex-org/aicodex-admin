## ADDED Requirements

### Requirement: 基础入口和账号轻页面 TypeScript 批量迁移
Admin 前端 SHALL 支持将基础入口、basic 展示页、账号轻组件和低风险独立轻文件从 legacy JavaScript 渐进迁移为 TypeScript/TSX，并保持现有路由、配置、请求 payload、展示语义和 JS/TS 共存边界兼容。

#### Scenario: 基础入口和 basic 展示组件迁移
- **WHEN** 开发者迁移基础入口和 basic 展示组件
- **THEN** `EntryPage`、`CaptchaPage` 和 `QrCodePage` SHALL 使用 `.tsx`
- **AND** `web-admin/src/basic/AppListPage`、`Dashboard`、`GridCards`、`SingleCard` 和 `CustomHead` SHALL 使用 `.tsx`
- **AND** 迁移 SHALL 保持现有 extensionless import、路由加载、跳转、captcha、二维码和 dashboard 展示数据契约不变

#### Scenario: 账号轻组件迁移
- **WHEN** 开发者迁移账号轻组件
- **THEN** `WeComProfileSyncPanel` 和 `AccountAvatar` SHALL 使用 `.tsx`
- **AND** `WeComProfileSyncPanel` 的 React 测试 SHALL 使用 `.test.tsx`
- **AND** 迁移 SHALL 保持账号资料同步入口、loading/error/success 展示、按钮行为和后端 API payload 语义不变

#### Scenario: 独立轻文件可并入迁移
- **WHEN** `pricing/SingleCard`、`IframeEditor`、`ToolTable`、`TourConfig` 或 `TourConfig` 测试不牵出共享组件、backend、auth、provider、shell/config 或其它并行 owner 写集
- **THEN** 这些文件 MAY 在同一 change 中迁移为 `.tsx` 或 `.test.tsx`
- **AND** 若类型洞需要扩大到受保护写集，相关文件 SHALL 被记录为 deferred，而不阻塞已确认 P0 文件完成迁移

#### Scenario: 行为和边界保持兼容
- **WHEN** 本批文件迁移为 TSX
- **THEN** 迁移 SHALL NOT 修改 `App.js`、`ManagementPage.js`、`Setting.js`、`BaseListPage.js`、`index.js`、`i18n.js`、`Conf.js`、`enterpriseNavigation.js`、`adminLoginRouting.js`、backend wrappers、common/table/auth/provider/Application/Syncer 写集
- **AND** 迁移 SHALL NOT 改变页面行为、跳转、二维码/captcha/account sync API payload、dashboard 数据契约、Tour 配置语义、真实认证链路或生产/类生产配置

#### Scenario: 批量迁移验证
- **WHEN** 基础入口、basic 展示页、账号轻组件和低风险独立轻文件迁移准备收口
- **THEN** OpenSpec strict validation、`git diff --check`、触碰测试的 focused Jest、`yarn typecheck`、增量 TypeScript gate 和 `yarn build` SHALL pass for touched TSX and JS coexistence paths
- **AND** focused Jest SHALL 真实执行 touched suites/tests，不得以 0 tests 作为通过证据
- **AND** 验证记录 SHALL NOT 包含 token、secret、Cookie、client secret、私有 URL、个人邮箱、手机号或其它敏感字段原值
