## 1. OpenSpec 与实施前门禁

- [x] 1.1 读取仓库和 `web-admin` 规则，确认当前分支基于最新 `origin/hfl-test-base` 且工作区只包含本 change 写集。
- [x] 1.2 完成 `proposal.md`、`design.md`、`tasks.md` 和两个 delta spec，并运行 `openspec validate migrate-llm-ai-gateway-site-scope-to-typescript --strict`。
- [x] 1.3 使用 `openspec-pre-implementation-review` 检查范围、非目标、写集、验证计划、文档语言和敏感信息边界，直到没有 Blocking/Fixable 问题。

## 2. 聚焦测试先行

- [x] 2.1 新增 `SiteListPage.test.tsx`，覆盖列表渲染、站点新增、删除成功/失败提示和分页回退关键路径。
- [x] 2.2 新增 `SiteEditPage.test.tsx`，覆盖站点基础加载、规则/证书/应用/provider 下拉数据加载、字段编辑、保存成功路由跳转和保存失败恢复语义。
- [x] 2.3 新增或合并覆盖 `RuleTable` 的 `.test.tsx` 测试，验证添加、删除、上移、下移和规则选择后回写 `owner/name` 字符串数组。
- [x] 2.4 运行站点范围 focused Jest tests，确认迁移前测试表达现有行为。

## 3. TSX 迁移实现

- [x] 3.1 将 `web-admin/src/table/RuleTable.js` 迁移为 `RuleTable.tsx`，补充 props、规则来源、已选规则、表格行和回调类型，保持现有 UI 和回写语义。
- [x] 3.2 将 `web-admin/src/SiteListPage.js` 迁移为 `SiteListPage.tsx`，补充 props、state、Site、Node、fetch 参数和 AntD 表格列类型，保持列表行为不变。
- [x] 3.3 将 `web-admin/src/SiteEditPage.js` 迁移为 `SiteEditPage.tsx`，补充 props、route params、state、Site、Rule、Cert、Application、Provider 和 API response 局部类型，保持编辑保存语义不变。
- [x] 3.4 仅在 TypeScript 导入解析需要时做最小 import 适配；不修改 `ManagementPage` 路由语义、不迁移 backend wrapper、不触碰治理规则编辑器。

## 4. 验证与覆盖率

- [x] 4.1 运行 `git diff --check` 和 `git diff --check origin/hfl-test-base...HEAD`。
- [x] 4.2 运行 `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 4.3 运行 `cd web-admin; yarn typecheck`。
- [x] 4.4 运行站点范围 focused Jest tests 和 changed-file coverage，统计对象覆盖 `SiteListPage.tsx`、`SiteEditPage.tsx`、`RuleTable.tsx`。
- [x] 4.5 如路由/import/build-time 行为受影响，运行 `cd web-admin; yarn build`。
- [x] 4.6 将验证命令、结果、覆盖率和剩余风险记录到 `verification.md`。

## 5. 归档前 Review 与交付单元

- [x] 5.1 使用 `openspec-pre-archive-review` 检查文档语言、主规格同步、代码、测试质量、覆盖率、验证记录脱敏和注释门槛。
- [x] 5.2 修复归档前 review 发现的 Blocking/Fixable 问题，并重跑必要验证。
- [x] 5.3 按授权模式执行 archive/closeout；最终不得 push/merge `test`，不得把多个进度 commits 原样合入 `hfl-test-base`。
