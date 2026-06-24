## 验证记录

### 自动化验证

- `openspec validate align-user-list-common-components --strict`：通过。
- `yarn test --watchAll=false --runInBand src/UserListPage.test.tsx`：通过，19 个测试全部通过。
- `yarn test --watchAll=false --runInBand src/UserListPage.test.tsx src/common/ListPageIdentityCell.test.tsx src/GroupListPage.test.tsx src/OrganizationListPage.test.tsx`：通过，62 个测试全部通过。
- `yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/UserListPage.tsx --collectCoverageFrom=src/common/ListPageIdentityCell.tsx src/UserListPage.test.tsx src/common/ListPageIdentityCell.test.tsx src/GroupListPage.test.tsx src/OrganizationListPage.test.tsx`：通过。
- `yarn typecheck`：通过。
- `yarn build`：通过。
- `git diff --check`：通过。

### 覆盖率

覆盖率统计对象为本次受影响实施代码：

- `src/UserListPage.tsx`：语句 100%，分支 86.75%，函数 100%，行 100%。
- `src/common/ListPageIdentityCell.tsx`：语句 100%，分支 94.44%，函数 100%，行 100%。

结论：受影响实施代码覆盖率达到 85% 门槛。

### 浏览器预览

- 本地仅启动 `web-admin` 前端 dev server，代理到 60环境 admin 后台，未启动本地后台。
- 浏览器访问本地组织页并完成登录后，组织列表从 60环境返回非空数据，分页显示 `3 总计`。
- 控制台仍有项目既有 AntD/React 警告；本 change 未引入新的阻断级运行错误。

### 剩余风险

- 浏览器验证属于本地前端代理 60环境的 UI smoke，不等同于部署环境端到端发布验证。
- 本 change 只调整用户列表公共组件复用边界，不改变后端 API、权限、同步或 Gateway projection 行为。
