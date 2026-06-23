## 1. OpenSpec 与实施前门禁

- [x] 1.1 确认工作分支基于最新 `origin/hfl-test-base`，且 active changes 仅为既有历史项和本 change。
- [x] 1.2 完成 proposal、design、delta spec 和 tasks，并通过 `openspec validate polish-admin-organization-list-compact-top --strict`。
- [x] 1.3 完成实施前 review，确认范围仅限组织列表顶部紧凑化，不触碰侧栏、标签页或后端契约。

## 2. TDD 锁定组织页紧凑顶部

- [x] 2.1 在 `OrganizationIdentityCenter.test.tsx` 增加失败测试：组织页主标题为 `组织`，不再展示 `组织主数据工作台`、描述文案、独立工作台容器或 `刷新状态`。
- [x] 2.2 在 `OrganizationListPage.test.tsx` 增加失败测试：组织页 `添加` 上移到紧凑标题行，仍按管理员权限可用/禁用，查询工具栏不再混入写操作。
- [x] 2.3 运行聚焦 Jest，确认新增测试在实现前因当前结构不满足预期而失败。

## 3. 组织页紧凑顶部实现

- [x] 3.1 调整 `OrganizationIdentityCenter.tsx`，为 `page === "organizations"` 渲染紧凑列表顶部结构，并保留其它实体页既有工作台结构。
- [x] 3.2 调整 `OrganizationListPage.tsx`，将添加操作作为组织页紧凑顶部 action 传入，查询工具栏只保留查询、重置和更多筛选。
- [x] 3.3 增加或调整局部样式，使标题行、筛选行、健康辅助文本和表格在桌面/窄屏下保持紧凑、可读、无页面级横向溢出。
- [x] 3.4 更新 zh/en locale，新增或调整 `目录质量`、目录健康辅助文本、结果数等用户可见文案。

## 4. 验证与 RC 交付

- [x] 4.1 运行聚焦 Jest 和受影响文件 coverage，确认 `OrganizationIdentityCenter`、`OrganizationListPage` 与共享查询工具栏相关行为通过且覆盖率达标或记录原因。
- [x] 4.2 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、`npx tsc --noEmit --pretty false`、`yarn build`。
- [x] 4.3 使用本地预览或 mock 预览截图验证 `/organizations` 桌面首屏：顶部不再呈现大工作台/health strip，表格明显上移，`目录质量` 入口和查询工具栏可见。
- [x] 4.4 更新 `verification.md` 和任务状态，形成 release-candidate 回传；不 archive、不合入 `hfl-test-base`、不 push `test`。

## 5. 验收补充：密码类型过滤统一入口

- [x] 5.1 评估组织列表横向滚动来源，确认本轮不直接删除表格横向滚动，后续应通过默认列密度/列配置另行处理。
- [x] 5.2 通过 TDD 锁定 `密码类型` 从表头 filter 迁移到查询字段和更多筛选的行为。
- [x] 5.3 实现 `密码类型` 查询字段 Select、更多筛选 Select，并移除表头 `passwordType` filter。
- [x] 5.4 复跑聚焦 Jest，确认组织列表查询、更多筛选、分页排序和重置语义通过。
