## 验证摘要

验证时间：2026-06-23。

预览地址：`http://localhost:7005/users`。

截图证据：`openspec/changes/polish-admin-user-list-table-density/artifacts/users-1440.png`。

## 命令验证

- `openspec validate "polish-admin-user-list-table-density" --strict`
  - 结果：通过，输出 `Change 'polish-admin-user-list-table-density' is valid`。
- `git diff --check`
  - 结果：通过，无 whitespace 报错。
- `yarn test --watchAll=false --runInBand src/UserListPage.test.tsx src/OrganizationIdentityCenter.test.tsx`
  - 结果：通过，`27 passed`。
- `yarn test --watchAll=false --runInBand src/UserListPage.test.tsx src/OrganizationIdentityCenter.test.tsx src/common/EnterpriseListQueryToolbar.test.tsx --coverage --collectCoverageFrom=src/UserListPage.tsx --collectCoverageFrom=src/OrganizationIdentityCenter.tsx --collectCoverageFrom=src/common/ListPageTable.tsx --collectCoverageFrom=src/common/EnterpriseListQueryToolbar.tsx --coverageReporters=text-summary --coverageReporters=text`
  - 结果：通过，`30 passed`。
  - 改动文件覆盖率：Statements `98.8%`，Branches `87.55%`，Functions `100%`，Lines `98.79%`。
  - 关键文件分支覆盖率：`UserListPage.tsx` `87.41%`，`OrganizationIdentityCenter.tsx` `88.88%`，`ListPageTable.tsx` `100%`，`EnterpriseListQueryToolbar.tsx` `86.36%`。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base; yarn typecheck --pretty false`
  - 结果：通过，`tsc --noEmit --pretty false` 退出码为 0。
- `yarn build`
  - 结果：通过。首次运行 React 编译阶段成功，但 Windows 本机文件锁导致 `mv.js` 重命名 `build-temp` 到 `build` 偶发 `EPERM`；随后单独 `node mv.js` 成功，第二次完整 `yarn build` 退出码为 0。
  - 已知提示：依赖侧 `Browserslist: caniuse-lite is outdated`、`fs.F_OK is deprecated` 和 bundle size 提示，非本 change 引入。

## 浏览器验证

使用当前 workspace `D:\CodeRepo\LeagProject\aicodex-1\aicodex-admin\web-admin` 在空闲端口 `7005` 启动：

`npx cross-env PORT=7005 BROWSER=none craco start`

端口核对：

- `7002` 为 `D:\CodeRepo\LeagProject\aicodex-0\aicodex-admin\web-admin` 的 dev server。
- `7003` 为 `D:\CodeRepo\LeagProject\aicodex-3\aicodex-admin\web-admin` 的 dev server。
- 本 change 使用 `7005`，避免复用其它 workspace 进程。

Playwright DOM 证据：

- URL：`http://localhost:7005/users`。
- 页面标题区域渲染为 `用户` + `2 条结果`。
- `.organization-identity-compact-list-page-users` 存在，旧 `账号生命周期工作台` 不存在。
- `.user-list-table` 存在，默认列为：`用户身份`、`联系方式`、`来源`、`已验证`、`创建时间`、`操作`。
- 表格行数：2。
- 行操作保留：`身份模拟` icon button、`编辑`、`删除`；受保护内置用户删除按钮为 disabled。
- 默认页面文本中未出现 `密码Salt值` / `Password Salt`。
- 默认列中未出现 `注册来源` / `Register source`。
- 1440 x 900 桌面视口下：
  - `.ant-table-body` `scrollWidth=1144`，`clientWidth=1144`，无表格内部横向溢出。
  - document `scrollWidth` 未超过 `clientWidth`，无页面级横向溢出。

## 剩余风险

- 浏览器控制台仍出现一次 React 警告：`Can't perform a React state update on a component that hasn't mounted yet`，栈指向 `UserListPage` 旧生命周期异步 setState 行为。本 change 未引入新的数据加载模型，自动化测试和浏览器渲染均可通过；建议后续单独治理旧 class component 生命周期问题。
- Jest 输出仍包含项目现有 `ReactDOM.render is no longer supported in React 18` 测试环境警告，未影响测试结果。
- 本验证只覆盖本地 dev server 和 mock/本地 API 返回，不触发生产、类生产、组织同步、认证刷新、授权刷新或 Gateway projection 操作。

## 2026-06-24 追加验证

追加原因：用户指出用户页漏接“更多筛选”，且组织、群组、用户列表文本字号未共用一套样式语义。

追加截图证据：`openspec/changes/polish-admin-user-list-table-density/artifacts/users-advanced-filters-1440.png`。

追加命令验证：

- `yarn test --watchAll=false --runInBand src/UserListPage.test.tsx`
  - 结果：通过，`19 passed`。
- `yarn test --watchAll=false --runInBand src/UserListPage.test.tsx src/GroupListPage.test.tsx src/OrganizationListPage.test.tsx`
  - 结果：通过，`58 passed`。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base; yarn typecheck --pretty false`
  - 结果：通过，`tsc --noEmit --pretty false` 退出码为 0。
- `openspec validate "polish-admin-user-list-table-density" --strict`
  - 结果：通过，输出 `Change 'polish-admin-user-list-table-density' is valid`。
- `git diff --check`
  - 结果：通过，无 whitespace 报错。
- `yarn test --watchAll=false --runInBand src/UserListPage.test.tsx src/GroupListPage.test.tsx src/OrganizationListPage.test.tsx src/OrganizationIdentityCenter.test.tsx src/common/EnterpriseListQueryToolbar.test.tsx --coverage --collectCoverageFrom=src/UserListPage.tsx --collectCoverageFrom=src/GroupListPage.tsx --collectCoverageFrom=src/OrganizationListPage.tsx --collectCoverageFrom=src/OrganizationIdentityCenter.tsx --collectCoverageFrom=src/common/ListPageTable.tsx --collectCoverageFrom=src/common/EnterpriseListQueryToolbar.tsx --coverageReporters=text-summary --coverageReporters=text`
  - 结果：通过，`70 passed`。
  - 覆盖率摘要：Statements `94.61%`，Branches `77.47%`，Functions `96.26%`，Lines `94.45%`。
  - 用户页覆盖率：`UserListPage.tsx` Statements `100%`，Branches `86.92%`，Functions `100%`，Lines `100%`。
  - 覆盖率口径说明：本轮为验证共享字号 class，将 `GroupListPage.tsx` 和 `OrganizationListPage.tsx` 一并纳入 collectCoverage；这两个页面存在既有未覆盖分支，导致整组 Branches 低于 85%。本轮对群组/组织的改动仅增加共享 class 名和对应断言，不改变查询、分页、删除或高级筛选逻辑。
- `yarn build`
  - 结果：通过，React 编译成功，`node mv.js` 成功将 `build-temp` 移动到 `build`。
  - 已知提示：依赖侧 `Browserslist: caniuse-lite is outdated`、`fs.F_OK is deprecated`、webpack dev middleware deprecation 和 bundle size 提示，非本 change 引入。

追加浏览器验证：

- `7005` 启动时被其它进程占用，未复用；本轮使用当前 workspace `D:\CodeRepo\LeagProject\aicodex-1\aicodex-admin\web-admin` 在 `7011` 启动：
  `npx cross-env PORT=7011 BROWSER=none craco start`
- URL：`http://localhost:7011/users`。
- Playwright DOM 证据：
  - 页面渲染为 `Users` + `2 results`。
  - `.user-list-table` 存在，默认列为：`User identity`、`Contact`、`Source`、`Is verified`、`Created time`、`Action`。
  - “More filters” 展开后 `.enterprise-list-query-toolbar-advanced` 存在。
  - 更多筛选字段为：`Name:`、`Display name:`、`Email:`、`Phone:`、`Organization:`、`Application:`，均使用英文冒号 `:`。
  - 用户表格行包含共享 class：`.enterprise-list-primary-text`、`.enterprise-list-secondary-text`、`.enterprise-list-status-tag`、`.enterprise-list-row-actions`。
  - 1440 x 900 视口下 `.ant-table-body` `scrollWidth=1144`，`clientWidth=1144`，无表格内部横向溢出；document `scrollWidth=1440`，`clientWidth=1440`，无页面级横向溢出。

追加剩余风险：

- 本轮更多筛选保持用户页现有后端单字段 `field + value` 查询契约；它不是多字段 AND 搜索。若后续产品要求用户页多字段组合搜索，需要先扩展后端查询契约或明确全量数据过滤策略。
- `http://localhost:7011` dev server 是本轮预览进程；后续 closeout 或回收 workspace 前应按需终止。
