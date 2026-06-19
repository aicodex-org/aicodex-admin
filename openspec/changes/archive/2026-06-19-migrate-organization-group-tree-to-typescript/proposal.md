## Why

“组织账号”菜单正在按增量 TypeScript 路线逐步迁移。`GroupTreePage.js` 是群组列表之后的自然下一步：它承载 `/trees/:organizationName` 和 `/trees/:organizationName/:groupName` 两个群组树入口，同时内嵌用户列表，需要在不改变组织筛选、群组树操作和路由行为的前提下迁移到 TSX。

## What Changes

- 将 `web-admin/src/GroupTreePage.js` 迁移为 `GroupTreePage.tsx`。
- 为群组树节点、页面 props/state、路由参数、Group backend 响应和嵌入 `UserListPage` 的调用补充局部 TypeScript 类型。
- 新增 `GroupTreePage.test.tsx`，覆盖树加载、空态、组织切换、群组选中、根群组新增、子群组新增、编辑跳转、删除成功/失败和非管理员 owner 初始化等核心行为。
- 保持 `ManagementPage.js` 对 `/trees/:organizationName` 和 `/trees/:organizationName/:groupName` 的导入与路由不变。
- 保持 `GroupBackend.js`、`GroupListPage.js`、`GroupEditPage.js`、`UserListPage.js` 和其它组织账号页面暂不迁移，除非类型兼容需要最小测试 stub。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加组织账号群组树页面的渐进 TSX 迁移要求，明确迁移必须保持路由、权限、接口和可见行为兼容。

## Impact

- 影响 `web-admin/src/GroupTreePage.*`、新增聚焦测试和 `web-admin-incremental-typescript` OpenSpec delta。
- 不修改后端 API、权限模型、群组数据结构、组织数据结构、认证/OIDC、同步器、企业微信/飞书组织同步或生产/类生产配置。
- 由于当前路线有多个未合入 RC，本 change 从最新 `origin/hfl-test-base` 独立创建；后续统一合入时需要处理主规格和页面迁移 RC 的顺序。
