## ADDED Requirements

### Requirement: Playwright E2E 资产使用独立 TypeScript 边界
Admin 前端 SHALL 使用 TypeScript 维护 Playwright config、fixtures、helpers 与 specs，并 SHALL 通过专用 E2E typecheck 保持 Node/test 类型与应用 `src` 类型边界分离。

#### Scenario: Playwright TypeScript 资产完成验证
- **WHEN** Playwright E2E 资产准备交付
- **THEN** 专用 TypeScript 配置 SHALL 覆盖 `playwright.config.ts`、fixtures、helpers 和全部 `*.spec.ts`
- **AND** 主 `web-admin/tsconfig.json` SHALL 继续只检查应用 `src`
- **AND** `yarn typecheck`、`yarn typecheck:build-tooling`、专用 E2E typecheck、增量 TypeScript gate、Playwright discovery 和完整 E2E SHALL 通过

### Requirement: 同步器编辑页渐进迁移保持独立契约
Admin 前端 SHALL 将同步器编辑页与字段表格的渐进 TypeScript 迁移要求保持为独立稳定契约，不得因 E2E runner 迁移而删除或弱化。

#### Scenario: 同步器编辑页迁移
- **WHEN** 后续 change 触碰身份源菜单下的同步器编辑页
- **THEN** `SyncerEditPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、route params、state、同步器记录、动态历史字段和编辑表单回调
- **AND** `SyncerTableColumnTable` SHOULD 迁移为 `.tsx` 并使用明确 props 类型描述字段行、表格数据和 `onUpdateTable` 回调
- **AND** 迁移 SHALL 保持 `/syncers/:syncerName` 路由、`ManagementPage` 无后缀 import、同步器加载、字段编辑、测试连接、保存、保存并退出、删除和跳转行为不变
- **AND** 迁移 SHALL NOT 修改同步器保存、源/目标配置、表格列编辑语义、后端 API 契约、真实数据库连接、真实外部同步器、Provider、Application、auth 或全局管理页壳

#### Scenario: 同步器编辑页迁移验证
- **WHEN** `SyncerEditPage` 和 `SyncerTableColumnTable` 被迁移为 TSX
- **THEN** 增量 TypeScript gate、`yarn typecheck`、同步器相关聚焦 Jest 和 `yarn build` SHALL pass for touched TSX and JS coexistence paths
- **AND** 本次触碰且包含 JSX 的新增测试 SHALL 使用 `.test.tsx`

## REMOVED Requirements

### Requirement: Cypress E2E assets migrate conservatively to TypeScript
**Reason**: Cypress config、support、spec 和专用类型边界已由 typed Playwright E2E 工具链完整替代，继续保留该稳定 requirement 会制造两个 runner 真值。

**Migration**: 使用 `web-admin/playwright.config.ts`、`web-admin/playwright/tsconfig.json`、fixtures/helpers 和 19 个 Playwright spec；通过 `yarn typecheck:e2e`、Playwright discovery 与完整 E2E 验证，不再调用 Cypress config/typecheck/action。
