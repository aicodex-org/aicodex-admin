## 1. OpenSpec

- [x] 1.1 创建 `migrate-llm-ai-gateway-agent-entry-to-typescript` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 运行 `openspec validate migrate-llm-ai-gateway-agent-entry-to-typescript --strict`。
- [x] 1.3 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. TypeScript 迁移

- [x] 2.1 将 `web-admin/src/AgentListPage.js` 重命名为 `AgentListPage.tsx`。
- [x] 2.2 为 Agent 列表页 props、state、Agent 记录、fetch 参数、表格列和回调补充局部 TypeScript 类型。
- [x] 2.3 将 `web-admin/src/AgentEditPage.js` 重命名为 `AgentEditPage.tsx`。
- [x] 2.4 为 Agent 编辑页路由 props、state、Agent/Organization/Application 记录、API 响应和字段更新补充局部 TypeScript 类型。
- [x] 2.5 保持 `ManagementPage.js` 无后缀导入、`/agents` 路由、总览块、列表操作、编辑保存删除、文案和接口行为不变；`LlmAiGatewayCenter.tsx` 仅做必要类型兼容。

## 3. 测试

- [x] 3.1 先新增或迁移聚焦 `.test.tsx` 测试，覆盖 Agent 列表页渲染和 `LlmAiGatewayCenter` 总览块存在。
- [x] 3.2 新增或迁移聚焦 `.test.tsx` 测试，覆盖 Agent 编辑页基础加载和保存关键路径。
- [x] 3.3 确认新增测试没有依赖真实 secret、Cookie、私有 URL、真实认证链路或真实后端服务。

## 4. 验证

- [x] 4.1 运行 OpenSpec strict 校验、`git diff --check`。
- [x] 4.2 在 `web-admin` 运行增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build`。
- [x] 4.3 在 `verification.md` 记录命令、覆盖率对象、结果、证据层级和剩余风险，验证记录保持脱敏。

## 5. 收口

- [x] 5.1 完成归档前 review，确认文档语言、主规格同步、注释、覆盖率、无越界写集和交付单元边界。

Archive、单 commit、push 工作分支、ff-only 合入 `hfl-test-base` 和工作分支清理由外层 closeout 流程在归档后执行。
