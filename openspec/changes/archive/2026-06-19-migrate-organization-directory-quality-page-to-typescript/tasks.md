## 1. OpenSpec 与实施前门禁

- [x] 1.1 完成 proposal/design/spec delta/tasks，并确认范围只包含目录质量页 TSX 迁移。
- [x] 1.2 执行实施前 review，修复 proposal/design/spec/tasks 中的阻塞或可直接修复问题。
- [x] 1.3 运行 `openspec validate migrate-organization-directory-quality-page-to-typescript --strict`、`openspec validate --changes --strict` 和 `git diff --check`，确认可进入实现。

## 2. 前端迁移

- [x] 2.1 将 `OrganizationDirectoryQualityPage.js` 迁移为 `.tsx`，保留函数组件和现有 hooks 结构。
- [x] 2.2 补齐页面局部类型，覆盖 props、筛选 state、分页、目录质量项、摘要、修复计划、draft、preflight、审批预览、审计和 operator note readiness。
- [x] 2.3 保持 `/organization-directory-quality` 路由、权限、文案、OrganizationSelect、API 调用、分页筛选、导出、详情 Drawer、错误态和空态行为不变。

## 3. 测试迁移与覆盖

- [x] 3.1 将 `OrganizationDirectoryQualityPage.test.js` 迁移为 `.test.tsx`，保留既有测试意图并修复 TS/Jest mock 类型。
- [x] 3.2 聚焦测试覆盖加载、筛选、导出、详情 Drawer、错误态、空态和修复预览相关展示行为。
- [x] 3.3 记录 changed-file coverage；若 statements/functions/lines 未达到 85%，说明缺口和补救路径。

## 4. 验证、归档与收口

- [x] 4.1 运行目标 OpenSpec validate、`openspec validate --changes --strict`、`openspec validate --specs --strict` 和 `git diff --check`。
- [x] 4.2 在 `web-admin` 下运行增量 TS gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build`。
- [x] 4.3 补充 `verification.md`，记录命令、结果、覆盖率、已知 warning 和剩余风险，并清理 build/coverage 产物。
- [x] 4.4 完成归档前 review；无 Blocking/Fixable 后 archive change，并再次验证 changes/specs strict。
- [x] 4.5 收敛为一个 change commit，显式 push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除工作分支；不 push/merge `test`。
