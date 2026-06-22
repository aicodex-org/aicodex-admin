## 1. OpenSpec

- [x] 创建 proposal/design/tasks/spec delta，限定组织账号列表查询工具栏范围。
- [x] 运行 `openspec validate polish-admin-organization-account-query-toolbar --strict`。
- [x] 完成实施前 review，确认 P0 先落地群组页，组织页不作为本次必做范围。

## 2. TDD 与实现

- [x] 先写 RED 测试，覆盖群组页工具栏主搜索入口、查询/重置/更多筛选分组、新增/导入动作独立、列头搜索入口降级。
- [x] 观察聚焦测试 RED，确认失败原因来自当前 UI 行为缺口。
- [x] 新增窄范围共享 TSX 查询工具栏组件，并补基础交互测试。
- [x] 将 `GroupListPage.tsx` 接入查询工具栏，保持后端参数、排序、分页和 CRUD/上传语义不变。
- [x] 同步必要 zh/en locale 文案和局部样式。

## 3. 验证

- [x] 运行群组页与共享组件聚焦 Jest/coverage。
- [x] 运行 `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 运行 `cd web-admin; yarn typecheck`。
- [x] 运行 `cd web-admin; yarn build`。
- [x] 运行 `git diff --check`。
- [x] 浏览器验证群组页桌面 `1440x900`，记录工具栏、按钮分组、横向溢出和 console/pageerror 结果；如组织页未改，说明 N/A。

## 4. 归档与收口

- [x] 完成归档前 review，检查文档语言、覆盖率、验证证据、脱敏和写集边界。
- [x] Archive change，并运行 `openspec validate --changes --strict` 与 `openspec validate --specs --strict`。
- [x] 收敛为最新 `origin/hfl-test-base + 1` 个本 change commit。
- [x] push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除本地和远端工作分支，最终 clean/aligned。
- [x] 写入最终 report 并结构化回传。
