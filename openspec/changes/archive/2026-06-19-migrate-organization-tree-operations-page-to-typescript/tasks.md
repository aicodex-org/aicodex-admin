## 1. OpenSpec 与启动门禁

- [x] 1.1 完成 proposal/design/spec delta/tasks，并确认范围只包含组织树运营页 TSX/TS 迁移。
- [x] 1.2 执行实施前 review，修复 proposal/design/spec/tasks 中的阻塞或可直接修复问题。
- [x] 1.3 运行 `openspec validate migrate-organization-tree-operations-page-to-typescript --strict` 和 `git diff --check`，确认可进入实现。

## 2. 前端迁移

- [x] 2.1 将 `OrganizationTreeOperationsBackend.js` 迁移为 `.ts`，保留 API 行为并导出诊断/成员响应类型。
- [x] 2.2 将 `OrganizationTreeOperationsPage.js` 迁移为 `.tsx`，补齐 props、state、筛选、节点、成员、刷新响应和 AntD 表格/树相关局部类型。
- [x] 2.3 保持现有路由 default export、用户可见文案、组织选择、诊断加载、筛选、树/表视图、刷新、成员抽屉、错误态和空态行为不变。

## 3. 测试迁移与覆盖

- [x] 3.1 将 `OrganizationTreeOperationsPage.test.js` 迁移为 `.test.tsx`，保留既有测试意图并修复 TS/Jest mock 类型。
- [x] 3.2 聚焦测试覆盖诊断加载、刷新成功/失败、筛选、树/表视图、成员分页抽屉、错误态和空态。
- [x] 3.3 记录 changed-file coverage；若 statements/functions/lines 未达到 85%，说明缺口和补救路径。

## 4. 验证与归档

- [x] 4.1 运行目标 OpenSpec validate、`openspec validate --changes --strict`、`openspec validate --specs --strict` 和 `git diff --check`。
- [x] 4.2 在 `web-admin` 下运行增量 TS gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build`。
- [x] 4.3 补充 `verification.md`，记录命令、结果、覆盖率、已知 warning 和剩余风险，并清理 build/coverage 产物。
- [x] 4.4 完成归档前 review；无 Blocking/Fixable 后 archive change，并再次验证 changes/specs strict。
- [x] 4.5 收敛为一个 change commit，显式 push 工作分支；按 release-candidate-only 交付，不合入或 push `hfl-test-base` / `test`。
