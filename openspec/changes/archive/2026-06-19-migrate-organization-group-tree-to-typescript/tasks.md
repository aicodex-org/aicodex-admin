## 1. 实施前准备

- [x] 1.1 复核当前分支基于最新 `origin/hfl-test-base`，工作区只包含本 change 写集。
- [x] 1.2 运行 target OpenSpec validate 和 `git diff --check`，完成实施前 review。

## 2. TSX 迁移

- [x] 2.1 将 `web-admin/src/GroupTreePage.js` 重命名为 `GroupTreePage.tsx`，保留默认导出和 `ManagementPage.js` 无后缀导入。
- [x] 2.2 为 account、route props、history、group tree node、state、new group draft 和 Group backend response 增加局部类型。
- [x] 2.3 保持组织选择、树加载、树展开、选中群组、显示全部、根群组新增、子群组新增、编辑跳转、叶子群组删除和内嵌 `UserListPage` 行为不变。
- [x] 2.4 确认 `GroupBackend.js`、`GroupListPage.js`、`GroupEditPage.js`、`UserListPage.js` 和其它组织账号页面不在本 change 中迁移。

## 3. 测试

- [x] 3.1 新增 `web-admin/src/GroupTreePage.test.tsx`，mock legacy backend、Setting、OrganizationSelect 和 UserListPage。
- [x] 3.2 覆盖树加载成功/空态/API 错误、组织切换、群组选中、显示全部、根群组新增、子群组新增、编辑跳转、删除成功/失败和非管理员 owner 初始化。
- [x] 3.3 记录 changed-file coverage，确认 `GroupTreePage.tsx` 覆盖率达到 85% 或说明无法达到的具体原因。

## 4. 验证与归档

- [x] 4.1 运行 `openspec validate migrate-organization-group-tree-to-typescript --strict`、`openspec validate --changes --strict`、`git diff --check`。
- [x] 4.2 在 `web-admin` 运行增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build`。
- [x] 4.3 补充 `verification.md`，完成归档前 review 并修复发现的问题。
- [x] 4.4 archive change，archive 后运行 `openspec validate --changes --strict`、`openspec validate --specs --strict` 和 `git diff --check`。
- [x] 4.5 收敛为单个 change commit，push 工作分支；不合入或 push `hfl-test-base` / `test`，并更新 `vault/threads.md`。
