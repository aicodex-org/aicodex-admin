## ADDED Requirements

### Requirement: 共享 UI primitives 批量 TypeScript 迁移
Admin 前端 SHALL 支持将低风险共享 UI primitives、select/modal/table 小组件从 legacy JavaScript 渐进迁移为 `.tsx` 或 `.ts`，并保持现有 JS/TS 共存、extensionless import 和用户可见行为兼容。

#### Scenario: 低风险共享组件迁移
- **WHEN** 本 change 迁移 `web-admin/src/common/select/*`、`web-admin/src/common/modal/*`、`web-admin/src/common/table/*`、`web-admin/src/common/*` 或 `web-admin/src/table/*` 中的低耦合组件
- **THEN** 含 JSX 的生产组件 SHALL 使用 `.tsx`
- **AND** 纯共享类型或 helper SHALL 使用 `.ts`
- **AND** 迁移 SHALL 使用局部 TypeScript interface/type 描述组件实际消费的 props、option、row、callback、pagination、modal state 或动态配置字段
- **AND** legacy JS 调用方 SHALL continue importing migrated components through existing extensionless paths

#### Scenario: 共享组件行为保持兼容
- **WHEN** 管理员使用迁移后的选择器、弹窗、分页、树、验证码/OAuth/SAML 展示组件、密码检查、测试组件或配置表组件
- **THEN** 后端查询、选择项展示、确认/取消、提交 loading、错误提示、分页计算、行新增删除、字段回写、disabled 状态、上传下载入口和 Tour/config 语义 SHALL 与迁移前保持兼容
- **AND** 迁移 SHALL NOT 修改 API path、HTTP method、payload shape、权限、i18n 文案、视觉样式或认证/OIDC/Gateway 行为

#### Scenario: 高风险共享边界可 deferred
- **WHEN** 某个候选组件迁移需要触碰 Provider 主表、Syncer owner 写集、页面级业务、auth 主流程、后端 wrapper、真实 provider contract 或高成本类型重塑
- **THEN** 该文件 MAY 被记录为 deferred
- **AND** deferred SHALL NOT 阻塞其它低风险共享组件迁移和验证
- **AND** 本 change SHALL NOT touch `web-admin/src/table/SyncerTableColumnTable.js`

#### Scenario: 共享组件迁移验证
- **WHEN** 共享组件批量迁移准备收口
- **THEN** OpenSpec strict validation、`git diff --check`、focused Jest、`yarn typecheck`、增量 TypeScript gate 和 `yarn build` SHALL pass for touched TSX and JS coexistence paths
- **AND** focused Jest SHALL include existing tests for `NavItemTree`、`OrganizationSelect` and `TablePagination`
- **AND** if Provider table files are touched, focused Jest SHALL include `ProviderTable.test`
- **AND** 验证记录 SHALL list deferred files and SHALL NOT include token、secret、Cookie、client secret、私有 URL、个人邮箱、手机号或其它敏感字段原值
