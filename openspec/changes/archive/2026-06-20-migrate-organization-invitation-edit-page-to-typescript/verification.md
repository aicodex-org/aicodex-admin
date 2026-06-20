## 验证摘要

本 change 将 `web-admin/src/InvitationEditPage.js` 保守迁移为 `InvitationEditPage.tsx`，并新增 `InvitationEditPage.test.tsx` 覆盖邀请码编辑页的加载、404、组织切换、字段更新、复制注册链接、发送邀请、保存、删除和错误处理。

## 命令与结果

- `openspec validate migrate-organization-invitation-edit-page-to-typescript --strict`：通过。
- `openspec validate --changes --strict`：通过，5 个 active changes 校验通过。
- `openspec validate --specs --strict`：通过，26 个 specs 校验通过。
- `git diff --check`：通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; yarn test --watchAll=false --runInBand --coverage --testMatch "**/src/InvitationEditPage.test.tsx" --collectCoverageFrom=src/InvitationEditPage.tsx --coverageReporters=text-summary --coverageReporters=json-summary`：通过，8 个测试通过。
- `cd web-admin; yarn build`：通过。

## 覆盖率

统计对象：`web-admin/src/InvitationEditPage.tsx` changed-file coverage。

- Statements：87.85%（94/107）
- Functions：87.27%（48/55）
- Lines：87.25%（89/102）
- Branches：65.43%（53/81）

Statements、functions、lines 均高于 85% 门槛。Branches 未设为本 change 的硬门槛，缺口主要来自 legacy class 组件的条件渲染、Modal 状态和错误路径组合。

## 归档前 review

- OpenSpec 文档语言：`proposal.md`、`design.md`、`tasks.md`、`verification.md` 和 delta spec 已检查，说明性正文以中文为主；OpenSpec 固定标题、命令、路径、API、字段名和规范关键字保留英文。
- 实现范围：diff 仅覆盖 `InvitationEditPage.js` 到 `InvitationEditPage.tsx` 的迁移、新增 `InvitationEditPage.test.tsx` 以及本 change OpenSpec 文档；未触碰身份源、OIDC、企微/飞书同步、后端 Go、数据库或 `test` 分支。
- 行为对齐：已对比最新 `origin/hfl-test-base` 中旧版 `InvitationEditPage.js`，加载、组织/应用/群组读取、字段更新、复制注册链接、发送邀请、保存、保存并退出、取消新增和删除路径保持一致。
- 注释 review：本 change 主要是 legacy 页面类型化迁移，没有新增公共 API、复杂算法、权限边界、跨服务契约或非显然业务 fallback；当前新增局部类型和测试命名足以表达意图，未发现阻断级注释缺口。
- 运行态验收口径：本 change 不声明真实环境端到端通过；验证结论限定为源码、测试、类型检查和 production build 层级。
- 脱敏检查：验证记录未包含真实 IP、私有 URL、token、Cookie、secret、手机号、个人邮箱或生产/测试环境直连信息。

## 已知 warning

- 聚焦 Jest 输出 React 18 既有 warning：`ReactDOM.render is no longer supported in React 18`。该 warning 来自当前测试栈和 `@testing-library/react` 版本组合，非本页面迁移引入。
- `yarn build` 输出既有 bundle size、`fs.F_OK` deprecation 和 Browserslist 数据过期提示；构建成功，未引入新的构建失败。

## 剩余风险

- 本 change 未做浏览器手工验证；页面行为由聚焦 React 测试、typecheck 和 production build 覆盖。
- 未迁移 `SignupPage.js`、`ManagementPage.js` 和其它非本 change 范围页面，后续 change 单独评估。
