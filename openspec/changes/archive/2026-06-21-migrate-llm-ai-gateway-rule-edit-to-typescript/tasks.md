## 1. OpenSpec 与实施前门禁

- [x] 1.1 补齐 `migrate-llm-ai-gateway-rule-edit-to-typescript` 的 proposal、design、tasks 和两个 delta spec。
- [x] 1.2 运行 `openspec validate migrate-llm-ai-gateway-rule-edit-to-typescript --strict`。
- [x] 1.3 使用 `openspec-pre-implementation-review` 检查范围、非目标、写集、验证计划、文档语言和敏感信息边界，直到没有 Blocking/Fixable 问题。

## 2. TDD 测试

- [x] 2.1 先新增 `RuleEditPage.test.tsx` 迁移门禁测试，确认 `.tsx` 文件存在且 legacy `.js` 文件不存在；迁移前该测试应按预期失败。
- [x] 2.2 覆盖规则加载、管理员组织加载、非管理员组织加载跳过、字段编辑、类型切换清空 expressions 和表达式回写。
- [x] 2.3 覆盖保存成功、保存失败路由回写、状态码/原因/verbose 字段、不同规则类型表格和 `CompoundRule` 渲染入口。

## 3. TSX 迁移实现

- [x] 3.1 将 `web-admin/src/RuleEditPage.js` 迁移为 `RuleEditPage.tsx`，补充 props、state、Rule、表达式、组织和 API response 局部类型。
- [x] 3.2 保持 `ManagementPage.js` 无后缀 import、`/rules/:organizationName/:ruleName` 路由、权限、文案、Rule API 调用、保存成功/失败和表达式回写行为不变。
- [x] 3.3 不迁移 `RuleBackend.js`、`OrganizationBackend.js`、规则表格组件、`CompoundRule` 或其它 LLM AI/Gateway 页面。

## 4. 验证与覆盖率

- [x] 4.1 运行 `git diff --check` 和 `git diff --check origin/hfl-test-base...HEAD`。
- [x] 4.2 运行 `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 4.3 运行 `cd web-admin; yarn typecheck`。
- [x] 4.4 运行 `RuleEditPage` focused Jest/coverage，统计对象覆盖 `RuleEditPage.tsx`。
- [x] 4.5 运行 `cd web-admin; yarn build` 验证 `ManagementPage.js` 到 `RuleEditPage.tsx` 的无后缀 import 构建路径。
- [x] 4.6 将验证命令、结果、覆盖率和剩余风险记录到 `verification.md`。

## 5. Release Candidate 收口

- [x] 5.1 完成归档前 review，确认文档语言、代码、测试质量、覆盖率、验证记录脱敏和无越界写集。
- [x] 5.2 已获得 `self-closeout=true` 授权后，按顺序执行 archive、单 commit 收敛、工作分支 push、ff-only 合入 `hfl-test-base`；不 push/merge `test`。
