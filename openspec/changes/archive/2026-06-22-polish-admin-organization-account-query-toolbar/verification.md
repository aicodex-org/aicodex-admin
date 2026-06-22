## 验证记录

### OpenSpec

- `openspec validate polish-admin-organization-account-query-toolbar --strict`：通过。
- `openspec validate --changes --strict`：通过，包含本 change 与三条历史遗留 active change。
- `openspec validate --specs --strict`：通过，28 个主规格全部通过。
- `git diff --check`：通过。

### TDD / Jest

- RED：新增 `web-admin/src/common/EnterpriseListQueryToolbar.test.tsx` 和 `GroupListPage.test.tsx` 页面级断言后，聚焦 Jest 失败；失败原因分别为共享组件不存在、群组页表格标题缺少查询/重置/更多筛选入口。
- GREEN：`cd web-admin; $env:CI='true'; yarn test --runInBand --watchAll=false src/common/EnterpriseListQueryToolbar.test.tsx src/GroupListPage.test.tsx`：通过，14 个测试通过。
- Coverage：`cd web-admin; $env:CI='true'; yarn test --runInBand --watchAll=false --coverage --coverageReporters=text --collectCoverageFrom=src/common/EnterpriseListQueryToolbar.tsx --collectCoverageFrom=src/GroupListPage.tsx src/common/EnterpriseListQueryToolbar.test.tsx src/GroupListPage.test.tsx`：通过。
  - `GroupListPage.tsx`：lines 92.91%，statements 93.07%，functions 90%，branches 73.01%。
  - `EnterpriseListQueryToolbar.tsx`：lines 100%，statements 100%，functions 100%，branches 94.73%。
  - 覆盖率未用全仓平均值替代；统计对象为本 change 触达的实施代码文件。

### TypeScript / Build

- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; yarn build`：通过。构建输出包含既有 `caniuse-lite is outdated`、Node deprecation 和 bundle size 提示；未发现本 change 引入的编译错误。

### Browser Smoke

- 本地 dev server：`cd web-admin; yarn start`，访问 `http://localhost:7002/groups`。
- 由于本地后端 `/api/get-account` 未连接，首次真实访问返回 504，无法进入已登录群组页；随后使用 Playwright 在浏览器会话中 mock 脱敏只读 fixture：`get-account`、`get-organizations`、`get-form`、`get-groups`。
- 桌面 `1440x900` 验证结果：
  - `hasToolbar=true`，工具栏文本包含 `群组`、`1 条结果`、`添加`、`下载模板`、`上传 (.xlsx)`、`名称`、`类型`、`查询`、`重置`、`更多筛选`。
  - `hasTableRow=true`，表格行包含脱敏 fixture `platform-admins`。
  - `horizontalOverflow=false`，`bodyScrollWidth=1440`，`viewportWidth=1440`。
  - `tableTop=141`，表格主任务进入首屏。
  - `pageErrorCount=0`。
  - `consoleErrorCount=1`，为既有 `GroupListPage` legacy 生命周期路径触发的 React `setState on unmounted component` warning；本 change 未改动 `BaseListPage` 生命周期。该项记录为剩余风险，不作为本工具栏布局阻断。

### 范围说明

- 本 change 只落地群组列表页和共享查询工具栏；组织列表页仍保留原列头搜索模式，作为后续低风险复用候选。
- 未新增 API，未修改后端，未触发组织同步、认证、授权刷新或 Gateway projection publish。
- 验证记录未包含 token、Cookie、DSN、client secret、Authorization header、完整私有 URL、raw payload、raw id、真实账号或完整组织树。
