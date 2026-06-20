## 1. OpenSpec 与实施前门禁

- [x] 1.1 完成 proposal、design、delta specs、tasks，并运行 `openspec validate migrate-llm-ai-gateway-mcp-store-to-typescript --strict`。
- [x] 1.2 完成实施前 review，确认范围只覆盖 MCP Store 目录页，不迁移 MCP Server 列表/编辑、站点或规则页面。

## 2. 测试优先覆盖

- [x] 2.1 新增 `ServerStorePage.test.tsx`，先覆盖 TSX 后缀、目录渲染、标题、加载线上目录和空态。
- [x] 2.2 扩展测试覆盖名称/标签筛选、清空筛选、刷新和三种线上目录响应格式兼容。
- [x] 2.3 扩展测试覆盖从目录创建本地 Server、production endpoint 缺失、创建失败和网络失败路径。

## 3. TypeScript 迁移

- [x] 3.1 将 `web-admin/src/ServerStorePage.js` 迁移为 `ServerStorePage.tsx`，补充局部 props、state、线上目录响应、归一化目录项、标签选项和创建 payload 类型。
- [x] 3.2 保持 `ManagementPage.js` 现有 `/server-store` 路由和 import 语义兼容，不重构其它 LLM AI/Gateway 页面。
- [x] 3.3 确认迁移不修改 `ServerBackend.js`、`ServerListPage.js`、`ServerEditPage.js` 或后端 MCP Server API 行为。

## 4. 验证与交付

- [x] 4.1 运行 `openspec validate --changes --strict`、`openspec validate --specs --strict`、`git diff --check` 和增量 TS gate。
- [x] 4.2 运行 `cd web-admin; yarn typecheck`、MCP Store focused Jest、changed-file coverage 和必要的 `yarn build`。
- [x] 4.3 更新 `verification.md`，记录命令、覆盖率、验证口径、脱敏和剩余风险。
- [x] 4.4 完成归档前 review；若未获得明确 `self-closeout=true` 授权，则仅交付 release candidate 工作分支，不合入 `hfl-test-base`。
