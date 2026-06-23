## 1. OpenSpec

- [x] 1.1 创建 `polish-admin-group-list-table-visual-density` proposal/design/tasks/spec delta，限定群组列表视觉密度 polish 范围。
- [x] 1.2 运行 `openspec validate polish-admin-group-list-table-visual-density --strict`。

## 2. 实现

- [x] 2.1 调整 `GroupListPage.tsx` 长 ID、显示名称和用户字段渲染，使表格扫描更稳定并保留完整值可达性。
- [x] 2.2 降低群组行操作列按钮权重，保持编辑、删除确认和有子群组禁用删除语义不变。
- [x] 2.3 增加 `.group-list-table` 局部样式，降低表格边框、固定列阴影、表头分割线和排序 tooltip 压迫感。
- [x] 2.4 将群组页和组织页共享“更多筛选”调整为工具栏内联展开，并为高级筛选字段 label 统一追加英文冒号。

## 3. 测试与验证

- [x] 3.1 补充群组列表聚焦 Jest，覆盖工具栏/表格行为、紧凑长字段渲染和删除禁用语义。
- [x] 3.1.1 补充共享查询工具栏、群组页和组织页聚焦 Jest，覆盖内联高级筛选、真实字段数量和冒号 label。
- [x] 3.2 运行 `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 3.3 运行 `cd web-admin; npx tsc --noEmit --pretty false`。
- [x] 3.4 运行 `cd web-admin; yarn test --watchAll=false --runInBand src/GroupListPage.test.tsx --coverage --collectCoverageFrom=src/GroupListPage.tsx --coverageReporters=text-summary`。
- [x] 3.5 运行 `git diff --check`。
- [x] 3.6 按风险运行 `cd web-admin; yarn build`。
- [x] 3.7 浏览器 mock smoke 覆盖 `/groups` desktop `1440x900` 与 mobile UA `390x844`。

## 4. Release Candidate Handoff

- [x] 4.1 写 release-candidate report 到 `C:\Users\Administrator\.codex\vault\agent-reports\AICodex\`。
- [x] 4.2 回传 branch/HEAD、预览 URL 或截图路径、验证摘要、剩余风险、进程残留、`lease_release=false`、`needs_user_review=true`、`push_test=false`。
