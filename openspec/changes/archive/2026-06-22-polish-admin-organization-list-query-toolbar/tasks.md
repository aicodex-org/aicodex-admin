## 1. OpenSpec

- [x] 创建 proposal/design/tasks/spec delta，限定组织页查询工具栏范围。
- [x] 运行 `openspec validate polish-admin-organization-list-query-toolbar --strict`。
- [x] 完成实施前 review，确认不需要产品或主控决策。

## 2. TDD 与实现

- [x] 先写 RED 测试，覆盖组织页使用共享查询工具栏、字段查询、重置和 `添加` 动作区。
- [x] 观察聚焦测试 RED，确认失败原因来自当前组织页旧表头布局缺口。
- [x] 将 `OrganizationListPage.tsx` 接入共享查询工具栏，保持后端参数、排序、分页和 CRUD 行为不变。
- [x] 回归共享工具栏与群组页聚焦测试，确认不破坏已合入群组页成果。

## 3. 验证

- [x] 运行组织页、共享组件和必要群组页聚焦 Jest/coverage。
- [x] 运行 `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 运行 `cd web-admin; yarn typecheck`。
- [x] 运行 `cd web-admin; yarn build`。
- [x] 运行 `git diff --check`。
- [x] 浏览器验证组织页桌面 `1440x900`，记录工具栏可见、表格顶部、横向溢出和 console/pageerror 结果。

## 4. 归档与收口

- [x] 补充 `verification.md`。
- [x] 完成归档前 review，检查文档语言、覆盖率、验证证据、脱敏和写集边界。
- [x] Archive change，并运行 `openspec validate --changes --strict` 与 `openspec validate --specs --strict`。
- [ ] 收敛为最新 `origin/hfl-test-base + 1` 个本 change commit。
- [ ] push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除本地和远端工作分支，最终 clean/aligned。
- [ ] 写入最终 report 并结构化回传。
