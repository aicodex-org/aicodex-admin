## 验证概览

本 change 只修改 Admin 前端组织页查询工具栏、聚焦测试、移动端样式和 OpenSpec 文档。验证使用本地开发环境和脱敏 mock API 响应完成前端布局 smoke；未触碰真实后端、真实认证链路、数据库、组织同步、Gateway 或 `test` 分支。

## TDD 记录

- RED：`cd web-admin; yarn test OrganizationListPage.test.tsx --watchAll=false --runInBand`
  - 结果：失败 1 项、通过 9 项。
  - 失败原因：新增用例期望 `Table.title` 复用 `EnterpriseListQueryToolbar`，当前实现返回旧 `"div"` 标题结构。
- GREEN：`cd web-admin; yarn test OrganizationListPage.test.tsx --watchAll=false --runInBand`
  - 结果：10/10 通过。
  - 说明：验证组织页工具栏复用、默认 `name` 查询、字段切换、重置和 `添加` 动作区。

## 自动化验证

- `openspec validate polish-admin-organization-list-query-toolbar --strict`
  - 结果：通过。
- `openspec validate --changes --strict`
  - 结果：4 个 active changes 全部通过。
- `openspec validate --specs --strict`
  - 结果：28 个主规格全部通过。
- `git diff --check`
  - 结果：通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：通过。
- `cd web-admin; yarn typecheck`
  - 结果：通过。
- `cd web-admin; yarn build`
  - 结果：通过；保留既有 bundle size、Browserslist 和依赖 deprecation 提示。

## 聚焦 Jest 与覆盖率

命令：

```bash
cd web-admin
yarn test OrganizationListPage.test.tsx EnterpriseListQueryToolbar.test.tsx GroupListPage.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/OrganizationListPage.tsx --collectCoverageFrom=src/common/EnterpriseListQueryToolbar.tsx
```

结果：

- Test Suites：3 passed。
- Tests：24 passed。
- `OrganizationListPage.tsx`：statements 100%、functions 100%、lines 100%、branches 84.21%。
- `EnterpriseListQueryToolbar.tsx`：statements 100%、functions 100%、lines 100%、branches 94.73%。
- 说明：本次改动文件/函数/行覆盖率达到 85% 以上；branch 缺口来自组织页既有历史条件分支。
- Jest console 输出包含 React 18 `ReactDOM.render` legacy warning，属于当前测试工具链既有提示。

## 浏览器布局验证

方式：启动 `cd web-admin; $env:BROWSER='none'; yarn start`，在 Playwright 中访问 `http://localhost:7002/organizations`，拦截以下脱敏 mock 响应：

- `/api/get-account`
- `/api/get-organizations`
- `/api/get-form`
- `/api/get-organization-names`

桌面 `1440x900`：

- 工具栏可见：true。
- 查询按钮可见：true。
- 重置按钮可见：true。
- `添加` 位于工具栏 actions 区：true。
- 表格可见：true。
- 表格顶部 y 坐标：447px。
- 页面级横向溢出：false。
- 表格内部横向滚动：true，符合宽表局部滚动预期。
- pageerror：0。

窄屏 `390x844`：

- 工具栏、查询、重置、`添加`、表格均可见。
- 页面级横向溢出：false。
- 表格内部横向滚动：true，符合宽表局部滚动预期。
- pageerror：0。

console 摘要：

- 复验后 pageerror 为 0。
- 浏览器 console 仍出现 1 条 React legacy warning：`OrganizationListPage` 在 mount 前异步 setState。该 warning 来自既有 legacy `BaseListPage` 生命周期模式，本 change 未重构生命周期，作为剩余风险记录。

验证后已停止本地 dev server，端口 `7002` 无监听残留。

## 剩余风险

- 组织页工具栏仍沿用后端单字段 `field + value` 查询语义，不支持多字段组合搜索。
- 密码类型仍保留既有表格列筛选，本 change 未迁移到工具栏，避免改变后端参数优先级。
- 浏览器 smoke 使用脱敏 mock API，只证明前端布局和交互入口，不作为真实后端或真实认证链路验收。
