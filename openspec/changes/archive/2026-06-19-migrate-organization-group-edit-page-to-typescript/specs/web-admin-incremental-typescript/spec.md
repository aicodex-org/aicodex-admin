## ADDED Requirements

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
