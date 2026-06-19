## ADDED Requirements

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
