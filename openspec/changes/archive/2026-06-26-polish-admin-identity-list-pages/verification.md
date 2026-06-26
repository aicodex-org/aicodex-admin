# 验证记录

## 自动化验证

- `openspec validate --changes --strict`: 通过。
- `openspec validate --specs --strict`: 通过。
- `openspec validate polish-admin-identity-list-pages --strict`: 通过。
- `git diff --check origin/hfl-test-base...HEAD`: 通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: 通过，无新增 JS/JSX 或测试后缀门禁问题。
- `yarn test RolePermissionListPages.test.tsx ModelPages.test.tsx AdapterPages.test.tsx EnforcerListPage.test.tsx OrganizationIdentityCenter.test.tsx --watchAll=false --runInBand`: 通过，5 个测试套件、50 个测试通过。
- `yarn typecheck`: 通过。
- `yarn build`: 通过。
- `rg "fixed\\s*:" web-admin/src/RoleListPage.tsx web-admin/src/PermissionListPage.tsx web-admin/src/ModelListPage.tsx web-admin/src/AdapterListPage.tsx web-admin/src/EnforcerListPage.tsx`: 无命中，确认目标列表页未保留 AntD `fixed` 列配置。

## 浏览器验证

- 本地预览地址使用 `http://127.0.0.1:7005`，前端代理连接 60环境。
- 已登录测试管理员后检查 `/permissions`、`/roles`、`/models`、`/adapters`、`/enforcers`。
- 每个页面均能渲染 `.ant-table`。
- 每个页面的 `.ant-table-cell-fix-left,.ant-table-cell-fix-right` 数量均为 `0`，符合取消不必要固定列的目标。

## 覆盖率

- `$env:CI='true'; yarn test RolePermissionListPages.test.tsx ModelPages.test.tsx AdapterPages.test.tsx EnforcerListPage.test.tsx OrganizationIdentityCenter.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/OrganizationIdentityCenter.tsx --collectCoverageFrom=src/RoleListPage.tsx --collectCoverageFrom=src/PermissionListPage.tsx --collectCoverageFrom=src/ModelListPage.tsx --collectCoverageFrom=src/AdapterListPage.tsx --collectCoverageFrom=src/EnforcerListPage.tsx`: 通过，5 个测试套件、50 个测试通过。
- 统计对象为本次受影响实现文件：`OrganizationIdentityCenter.tsx`、`RoleListPage.tsx`、`PermissionListPage.tsx`、`ModelListPage.tsx`、`AdapterListPage.tsx`、`EnforcerListPage.tsx`。
- 覆盖率结果：受影响文件总体 statements `98.71%`、branches `87.86%`、functions `97.26%`、lines `98.65%`；单文件 branch 覆盖率最低为 `RoleListPage.tsx` 的 `85.41%`，达到 85% 门槛。

## 已知非本次风险

- 运行测试和浏览器验证时可见项目既有 React 18 `ReactDOM.render` warning。
- `/enforcers` 浏览器检查中曾出现既有 setState before mount warning，不属于本次固定列和顶部区域收口改动。

## 脱敏说明

- 本记录只使用“60环境”作为测试环境别名，不记录真实地址、账号、密码、token、Cookie 或其它敏感信息。
