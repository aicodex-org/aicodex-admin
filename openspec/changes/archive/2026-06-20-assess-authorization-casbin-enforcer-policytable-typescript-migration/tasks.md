## 1. 现状评估

- [x] 1.1 从 `origin/hfl-test-base` 创建 `hfl-test/assess-authorization-casbin-enforcer-policytable-typescript-migration`，确认不叠加 Adapter release candidate。
- [x] 1.2 只读审查 `EnforcerListPage.js`、`EnforcerEditPage.js`、`table/PolicyTable.js`、`EnforcerBackend.js` 和 `AdapterBackend.js` 的职责、调用关系和风险边界。
- [x] 1.3 确认当前 change 不修改生产源码、不迁移执行器页面、不触碰 `test`、后端、真实策略数据或敏感配置。

## 2. OpenSpec 评估文档

- [x] 2.1 创建 proposal，说明为什么执行器和 `PolicyTable` 需要先评估再迁移。
- [x] 2.2 创建 design，固化 `EnforcerListPage` 独立迁移候选与 `EnforcerEditPage` + `PolicyTable` 高风险迁移候选的拆分决策。
- [x] 2.3 创建 `web-admin-incremental-typescript` delta spec，明确后续迁移的兼容边界和验证要求。

## 3. Review 与验证

- [x] 3.1 运行 `openspec validate assess-authorization-casbin-enforcer-policytable-typescript-migration --strict`、`openspec validate --changes --strict` 和 `git diff --check`。
- [x] 3.2 完成 `openspec-pre-implementation-review`，确认评估 scope、后续候选 change、风险和验证计划无 Blocking/Fixable。
- [x] 3.3 补充 `verification.md`，说明本 change 为 docs/spec-only，单测覆盖率 N/A，并记录未改生产代码依据。
- [x] 3.4 archive change，archive 后运行 `openspec validate --changes --strict`、`openspec validate --specs --strict` 和 `git diff --check`。
- [x] 3.5 收敛为 `origin/hfl-test-base + 1 个本 change commit`，push 工作分支；不 push/merge `test`，未明确 self-closeout 时不 push `hfl-test-base`。
