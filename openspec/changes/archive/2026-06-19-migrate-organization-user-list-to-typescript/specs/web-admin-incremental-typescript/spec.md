## ADDED Requirements

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
