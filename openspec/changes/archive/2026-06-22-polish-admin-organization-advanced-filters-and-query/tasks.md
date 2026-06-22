## 1. OpenSpec

- [x] 1.1 创建 proposal/design/tasks/spec delta，限定组织页高级筛选与共享 toolbar 空插槽行为。
- [x] 1.2 运行 `openspec validate polish-admin-organization-advanced-filters-and-query --strict`。
- [x] 1.3 完成实施前 review，确认不需要产品或主控决策。

## 2. TDD 与实现

- [x] 2.1 先写 RED 测试，覆盖共享 toolbar 空 `advancedFilters` 不渲染“更多筛选”按钮。
- [x] 2.2 先写 RED 测试，覆盖组织页高级筛选渲染真实字段输入。
- [x] 2.3 先写 RED 测试，覆盖组织页高级筛选多字段 AND 查询、过滤后 total 和重置清空。
- [x] 2.4 实现共享 toolbar 空插槽判断。
- [x] 2.5 实现组织页高级筛选状态、输入控件、AND 过滤和重置。
- [x] 2.6 补充必要样式，确认桌面与窄屏不因高级筛选工具栏新增横向溢出；组织宽表仍保留内部横向滚动。

## 3. 验证

- [x] 3.1 运行组织页和共享 toolbar 聚焦 Jest。
- [x] 3.2 运行 touched TS/TSX 覆盖率并记录结果。
- [x] 3.3 运行 `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 3.4 运行 `cd web-admin; yarn typecheck`。
- [x] 3.5 运行 `cd web-admin; yarn build`。
- [x] 3.6 运行 `git diff --check`。
- [x] 3.7 做浏览器 mock smoke：桌面基础查询、高级多字段 AND、重置；窄屏确认工具栏不新增溢出、固定列禁用、表格内部横向滚动保留。

## 4. 归档与收口

- [x] 4.1 补充 `verification.md`。
- [x] 4.2 完成归档前 review。
- [x] 4.3 Archive change，并运行 `openspec validate --changes --strict` 与 `openspec validate --specs --strict`。
- [x] 4.4 收敛为最新 `origin/hfl-test-base + 1` 个本 change commit。
- [x] 4.5 push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除本地和远端工作分支，最终 clean/aligned。
- [x] 4.6 写入最终 report 并结构化回传。
