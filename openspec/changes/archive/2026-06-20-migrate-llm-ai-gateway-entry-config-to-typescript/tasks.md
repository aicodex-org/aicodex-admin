## 1. OpenSpec 与实施前门禁

- [x] 1.1 完成 proposal、design、delta specs、tasks，并运行 `openspec validate migrate-llm-ai-gateway-entry-config-to-typescript --strict`。
- [x] 1.2 完成实施前 review，确认范围只覆盖入口配置管理页，不迁移 `EntryPage.js`、MCP、站点或规则页面。

## 2. TypeScript 迁移

- [x] 2.1 将 `web-admin/src/EntryListPage.js` 迁移为 `EntryListPage.tsx`，补充局部类型并保持列表、新增、删除、分页、搜索和排序行为不变。
- [x] 2.2 将 `web-admin/src/EntryEditPage.js` 迁移为 `EntryEditPage.tsx`，补充局部类型并保持读取、组织/应用下拉、字段编辑、保存、取消新增、删除和 404 跳转行为不变。
- [x] 2.3 确认 `ManagementPage.js` 现有 `/entries` 路由和 import 语义保持兼容，不重构其它 LLM AI/Gateway 页面。

## 3. 测试与覆盖率

- [x] 3.1 新增或迁移 `EntryListPage.test.tsx`，覆盖列表渲染、入口配置标题、添加和删除关键路径。
- [x] 3.2 新增或迁移 `EntryEditPage.test.tsx`，覆盖编辑页基础加载、字段渲染、保存/保存并退出和异常路径。
- [x] 3.3 运行入口配置页面 focused Jest 和 changed-file coverage，确认受影响实现文件覆盖率达到 85%。

## 4. 验证、归档与收口

- [x] 4.1 运行 `openspec validate --changes --strict`、`openspec validate --specs --strict`、`git diff --check`、增量 TS gate、`yarn typecheck` 和必要的 `yarn build`。
- [x] 4.2 完成归档前 review，检查文档语言、验证口径、脱敏、注释、主规格同步和写集边界。
- [x] 4.3 归档 OpenSpec change，收敛为单个本 change commit，push 工作分支并在门槛满足时 ff-only 合入 `hfl-test-base`，不触碰 `test`。
- [x] 4.4 写入最终报告，记录验证、覆盖率、changed files、剩余风险和后续候选任务。
