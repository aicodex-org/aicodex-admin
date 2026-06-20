## 1. OpenSpec 与实施前门禁

- [x] 1.1 读取仓库和 `web-admin` 规则，确认当前分支基于最新 `origin/hfl-test-base` 且工作区只包含本 change 写集。
- [x] 1.2 完成 `proposal.md`、`design.md`、`tasks.md` 和两个 delta spec，并运行 `openspec validate migrate-llm-ai-gateway-rule-list-to-typescript --strict`。
- [x] 1.3 使用 `openspec-pre-implementation-review` 检查范围、非目标、写集、验证计划、文档语言和敏感信息边界，直到没有 Blocking/Fixable 问题。

## 2. 聚焦测试先行

- [x] 2.1 新增 `RuleListPage.test.tsx`，覆盖列表加载、现有 Rule API 参数、表格列 render 和编辑跳转。
- [x] 2.2 覆盖新增默认 User-Agent 规则、删除成功/失败、分页回退、列表失败提示或 loading 恢复语义。
- [x] 2.3 先运行 focused Jest，确认 `.tsx` 迁移断言在实现前按预期失败。

## 3. TSX 迁移实现

- [x] 3.1 将 `web-admin/src/RuleListPage.js` 迁移为 `RuleListPage.tsx`，补充 props、state、Rule、Expression、fetch 参数、backend response 和 AntD 表格列类型。
- [x] 3.2 保持 `ManagementPage` extensionless import、`/rules` 路由、列表、新增、删除、分页、排序、编辑跳转、Tag 渲染和文案行为不变。
- [x] 3.3 不迁移 `RuleBackend.js`、`RuleEditPage.js`、`CompoundRule.js` 或任何规则表达式表格组件。

## 4. 验证与覆盖率

- [x] 4.1 运行 `git diff --check` 和 `git diff --check origin/hfl-test-base...HEAD`。
- [x] 4.2 运行 `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 4.3 运行 `cd web-admin; yarn typecheck`。
- [x] 4.4 运行 RuleList focused Jest tests 和 changed-file coverage，统计对象覆盖 `RuleListPage.tsx`。
- [x] 4.5 如路由/import/build-time 行为受影响，运行 `cd web-admin; yarn build`。
- [x] 4.6 将验证命令、结果、覆盖率和剩余风险记录到 `verification.md`。

## 5. 归档前 Review 与交付单元

- [x] 5.1 使用 `openspec-pre-archive-review` 检查文档语言、主规格同步、代码、测试质量、覆盖率、验证记录脱敏和注释门槛。
- [x] 5.2 修复归档前 review 发现的 Blocking/Fixable 问题，并重跑必要验证。
- [x] 5.3 按授权模式执行 archive/closeout；最终不得 push/merge `test`，不得把多个进度 commits 原样合入 `hfl-test-base`。
