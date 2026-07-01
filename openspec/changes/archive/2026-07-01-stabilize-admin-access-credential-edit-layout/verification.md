## 验证摘要

本 change 已完成应用接入、凭据和集成配置编辑页内部表单布局 scoped 修复。验证只覆盖前端源码、样式契约、构建和本地静态 DOM 布局，不声明真实后端保存链路、LDAP 同步链路或凭据业务链路已通过端到端验收。

## TDD 记录

- RED：新增 `web-admin/src/AccessCredentialEditLayout.test.ts` 后运行 `yarn test AccessCredentialEditLayout.test.ts --watchAll=false`，8 个测试按预期失败，失败原因是七个候选编辑页缺少 `admin-access-edit-*` class，`App.less` 缺少 scoped CSS。
- GREEN：为 `CertEditPage`、`KeyEditPage`、`WebhookEditPage`、`TokenEditPage`、`LdapEditPage`、`AdapterEditPage`、`EnforcerEditPage` 增加根页面、Card 和字段行 scoped class；在 `App.less` 增加 `admin-access-edit-*` scoped 布局规则后，同一聚焦测试通过。

## 命令验证

- `openspec validate stabilize-admin-access-credential-edit-layout --strict`：通过。
- `openspec validate --changes --strict`：通过，4 个 active changes 均通过。
- `openspec validate --specs --strict`：通过，30 个 specs 均通过。
- `git diff --check origin/hfl-test-base...HEAD`：通过。
- `web-admin > node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `web-admin > yarn test AccessCredentialEditLayout.test.ts --watchAll=false`：通过，1 个 suite / 8 个 tests。
- `web-admin > yarn typecheck`：通过。
- `web-admin > yarn build`：通过；输出包含既有 `DEP0176`、Browserslist outdated 和 CRA bundle-size warning，未发现本 change 编译错误。

## 浏览器 Smoke

使用 Playwright 打开脱敏 data URL 静态 DOM，DOM 只包含本 change scoped CSS 和 AntD-like `.ant-card-body` / `.ant-row` / `.ant-col` 结构。未启动 dev server，未连接真实后端。

- 1280x720：`window.innerWidth=1280`，`documentElement.scrollWidth=1280`，`clientWidth=1280`，`hasPageOverflowX=false`；普通字段行 label 宽度 `184px`，内容列宽度 `806px`；双编辑器行两个 label 均为 `184px`，内容列分别约 `287px` / `299px`。
- 390x844：`window.innerWidth=390`，`documentElement.scrollWidth=390`，`clientWidth=390`，`hasPageOverflowX=false`；普通字段行 label/content 均为 `340px`，内容列位于 label 下方；双编辑器行内容列也位于 label 下方。

## 覆盖率

N/A。本次实现代码改动是页面 class hook 和 scoped CSS 布局契约，不修改可执行业务逻辑、API payload、路由、权限、字段语义或保存行为。按 `web-admin/AGENTS.md` 对普通 UI/样式任务的规则，使用源码契约 Jest、typecheck、build 和浏览器 smoke 覆盖，不为覆盖率制造低价值组件 mock。

## 范围说明

- 纳入：`CertEditPage`、`KeyEditPage`、`WebhookEditPage`、`TokenEditPage`、`LdapEditPage`、`AdapterEditPage`、`EnforcerEditPage`。
- 排除：`LdapSyncPage`，该页是 LDAP 用户同步表格工作流，不是内部 label/content 编辑表单。
- 未触碰：组织、用户、应用、Provider、Syncer、Gateway Agent/Entry/Server/Site/Rule、大编辑页历史 archive、Gateway 历史 archive、billing/product/order、`test` 分支。

## 剩余风险

- 浏览器 smoke 使用静态 DOM 验证布局契约，没有使用真实登录态页面或真实后端数据。
- `yarn build` 保留仓库既有依赖和 Browserslist warning，本 change 未处理这些历史 warning。
