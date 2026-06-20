## 1. OpenSpec

- [x] 1.1 创建 `migrate-system-tools-menu-pages-to-typescript` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. 页面迁移

- [x] 2.1 将 `/sysinfo` 页面 `SystemInfo` 迁移为 `.tsx`，保留系统信息加载、轮询、timer 清理、Tour 和 Prometheus 展示行为。
- [x] 2.2 将 `/forms` 页面 `FormListPage` 迁移为 `.tsx`，保留表单列表、表单项展示、添加、删除、分页筛选排序和权限处理行为。
- [x] 2.3 将 `/forms/:formName` 页面 `FormEditPage` 迁移为 `.tsx`，保留表单加载、类型切换、默认表单项、动态字段表格、列表预览和保存行为。
- [x] 2.4 将 `/tickets` 页面 `TicketListPage` 迁移为 `.tsx`，保留工单列表、状态标签、添加、删除、分页筛选排序和权限处理行为。
- [x] 2.5 将 `/tickets/:organizationName/:ticketName` 页面 `TicketEditPage` 迁移为 `.tsx`，保留工单加载、字段编辑、状态选择、消息展示、消息发送和 404 跳转行为。
- [x] 2.6 确认 `/swagger` API 文档仍为 `enterpriseNavigation` 外链，不新增 React 页面或路由实现。

## 3. 测试

- [x] 3.1 新增或迁移 `.test.tsx` 聚焦测试，覆盖系统信息、表单列表/编辑、工单列表/编辑和 API 文档外链边界。
- [x] 3.2 测试断言页面行为和用户可见输出，不断言 mock 组件本身存在，不写真实密钥、token、私有 URL 或生产配置。

## 4. 验证

- [x] 4.1 运行 `openspec validate migrate-system-tools-menu-pages-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict`。
- [x] 4.2 运行 `git diff --check`。
- [x] 4.3 在 `web-admin` 运行增量 TypeScript gate、`yarn typecheck`、focused Jest coverage 和 `yarn build`。
- [x] 4.4 在 `verification.md` 记录命令、覆盖率对象、结果、既有 warning 和剩余风险，验证记录保持脱敏。

## 5. 收口

- [x] 5.1 完成归档前 review，确认文档语言、注释、覆盖率、主规格同步和交付单元边界。
- [x] 5.2 archive change 后收敛为单 change commit，push 工作分支，验证通过后 ff-only 合入 `hfl-test-base` 并删除工作分支。
