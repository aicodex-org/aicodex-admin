## 1. Implementation

- [x] 1.1 审查候选应用接入、凭据和集成配置编辑页，确认纳入范围并避开已完成 large/gateway 页面。
- [x] 1.2 先新增源码/样式契约测试，覆盖本 change 页面 class hook、字段行 class hook 和 scoped CSS。
- [x] 1.3 为纳入范围的编辑页增加 `admin-access-edit-*` scoped class，不改变 API payload、路由、权限或字段语义。
- [x] 1.4 在 `App.less` 中增加仅命中 `admin-access-edit-*` 的桌面 label/content 稳定布局与窄屏换行规则。

## 2. Verification

- [x] 2.1 运行 `openspec validate stabilize-admin-access-credential-edit-layout --strict`。
- [x] 2.2 运行 `openspec validate --changes --strict` 和 `openspec validate --specs --strict`。
- [x] 2.3 运行 `git diff --check origin/hfl-test-base...HEAD`。
- [x] 2.4 在 `web-admin` 下运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、`yarn typecheck`、聚焦 Jest 和 `yarn build`。
- [x] 2.5 执行本地浏览器 smoke，至少覆盖 1280px 桌面布局契约，并记录其只验证前端布局。
- [x] 2.6 更新 `verification.md`，记录命令、结果、浏览器证据、覆盖率/N/A 说明和剩余风险。

## 3. Closeout

- [x] 3.1 完成归档前 review，确认文档、测试、注释和验证记录没有阻断问题。
- [x] 3.2 archive OpenSpec 并同步主规格。
- [x] 3.3 收敛为一个逻辑 change commit，普通非强制 push 到 `origin/hfl-test-base`，删除本地/远端工作分支，不 push/merge `test`。
