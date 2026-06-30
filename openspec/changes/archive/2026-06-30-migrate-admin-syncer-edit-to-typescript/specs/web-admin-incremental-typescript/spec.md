## MODIFIED Requirements

### Requirement: 后续新增代码约定
Admin 前端后续新增 React 组件 SHALL 默认使用 `.tsx`；新增共享逻辑、接口模型和类型定义 SHALL 默认使用 `.ts`；既有 JS SHALL 只在被需求触及时渐进迁移。

#### Scenario: 同步器编辑页迁移
- **WHEN** 后续 change 触碰身份源菜单下的同步器编辑页
- **THEN** `SyncerEditPage` SHOULD 迁移为 `.tsx` 并使用明确局部类型描述 props、route params、state、同步器记录、动态历史字段和编辑表单回调
- **AND** `SyncerTableColumnTable` SHOULD 迁移为 `.tsx` 并使用明确 props 类型描述字段行、表格数据和 `onUpdateTable` 回调
- **AND** 迁移 SHALL 保持 `/syncers/:syncerName` 路由、`ManagementPage.js` 无后缀 import、同步器加载、字段编辑、测试连接、保存、保存并退出、删除和跳转行为不变
- **AND** 迁移 SHALL NOT 修改同步器保存、源/目标配置、表格列编辑语义、后端 API 契约、真实数据库连接、真实外部同步器、Provider、Application、auth 或全局管理页壳

#### Scenario: 同步器编辑页迁移验证
- **WHEN** `SyncerEditPage` 和 `SyncerTableColumnTable` 被迁移为 TSX
- **THEN** 增量 TypeScript gate、`yarn typecheck`、同步器相关聚焦 Jest 和 `yarn build` SHALL pass for touched TSX and JS coexistence paths
- **AND** 本次触碰且包含 JSX 的新增测试 SHALL 使用 `.test.tsx`
