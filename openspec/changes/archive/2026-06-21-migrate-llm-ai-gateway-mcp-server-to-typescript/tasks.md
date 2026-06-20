## 1. OpenSpec 与范围确认

- [x] 1.1 创建 proposal、design、tasks 和 delta specs，明确本 change 只迁移 MCP Server 列表与编辑页。
- [x] 1.2 运行 `openspec validate migrate-llm-ai-gateway-mcp-server-to-typescript --strict`。
- [x] 1.3 完成实施前 review，确认范围不包含 `ServerBackend.js`、`ServerStorePage.js`、`ToolTable.js`、站点范围、治理规则或规则表格。

## 2. TDD 与 TypeScript 迁移

- [x] 2.1 先新增 `ServerListPage.test.tsx`，覆盖列表页渲染、新增、删除、分页回退、MCP Store 跳转和错误提示关键路径，并验证旧 `.js` 文件迁移断言进入 RED。
- [x] 2.2 先新增 `ServerEditPage.test.tsx`，覆盖编辑页加载、404、字段更新、组织切换、ToolTable 更新、保存、保存并退出、取消新增、删除和错误提示关键路径，并验证旧 `.js` 文件迁移断言进入 RED。
- [x] 2.3 将 `web-admin/src/ServerListPage.js` 重命名为 `ServerListPage.tsx`，补充局部 props/state/Server/fetch/AntD table 类型并保持行为不变。
- [x] 2.4 将 `web-admin/src/ServerEditPage.js` 重命名为 `ServerEditPage.tsx`，补充局部路由 props/state/Server/Organization/Application/Tool/API response 类型并保持行为不变。
- [x] 2.5 确认 `ManagementPage.js` 现有 `/servers` 路由和 import 语义保持兼容，不重构其它 `LLM AI/Gateway` 页面。

## 3. 验证与覆盖率

- [x] 3.1 运行 MCP Server focused Jest tests，确认列表和编辑页测试通过。
- [x] 3.2 运行 changed-file coverage，确认 `ServerListPage.tsx` 和 `ServerEditPage.tsx` 覆盖率达到 85%。
- [x] 3.3 运行 `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 3.4 运行 `cd web-admin; yarn typecheck`。
- [x] 3.5 运行 `cd web-admin; yarn build`，验证 `ManagementPage.js` 到迁移后 TSX 页面的导入边界。
- [x] 3.6 运行 `openspec validate --changes --strict`、`openspec validate --specs --strict` 和 `git diff --check`。

## 4. 收尾

- [x] 4.1 更新 `verification.md`，记录命令、结果、覆盖率、已知警告和剩余风险。
- [x] 4.2 完成归档前 review，确认无越界写集、文档语言和验证记录脱敏。
- [x] 4.3 将本 change 收敛为单个提交并推送工作分支。
- [x] 4.4 若当前任务未明确 `self-closeout=true`，仅交付 release candidate，不 archive、不合入 `hfl-test-base`、不删除工作分支。
