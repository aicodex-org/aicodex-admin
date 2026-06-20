## ADDED Requirements

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
