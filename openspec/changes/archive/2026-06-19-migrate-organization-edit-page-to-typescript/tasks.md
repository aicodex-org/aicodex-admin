## 1. OpenSpec 与范围确认

- [x] 1.1 完成 proposal、design、tasks 和 `web-admin-incremental-typescript` spec delta。
- [x] 1.2 运行目标 change strict validate 与 `git diff --check`，完成实施前 review。

## 2. 页面迁移实现

- [x] 2.1 将 `web-admin/src/OrganizationEditPage.js` 迁移为 `OrganizationEditPage.tsx`，保留默认导出、路由使用方式和 class component 行为。
- [x] 2.2 为页面 props、state、组织记录、应用记录、LDAP 记录、交易记录和通用 backend 响应补充局部 TypeScript 类型。
- [x] 2.3 处理历史 JS 组件和 backend 导入的兼容类型边界，避免迁移无关 backend、table 或主题组件。

## 3. 聚焦测试

- [x] 3.1 新增 `OrganizationEditPage.test.tsx`，覆盖加载成功、组织不存在跳转、接口错误提示和交易记录条件展示。
- [x] 3.2 覆盖保存成功/失败、主题回调、`storageOrganizationsChanged` 事件、删除成功/失败和新增模式取消。
- [x] 3.3 保留现有 `OrganizationEditPage.test.ts` 工具函数测试，除非迁移实现需要低风险调整。

## 4. 验证

- [x] 4.1 运行 `openspec validate migrate-organization-edit-page-to-typescript --strict`、`openspec validate --changes --strict` 和 `git diff --check`。
- [x] 4.2 在 `web-admin` 下运行增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build`。
- [x] 4.3 在 `verification.md` 记录命令、结果、changed-file coverage 和剩余风险。

## 5. 归档与收口

- [x] 5.1 完成归档前 review 并修复阻塞问题。
- [x] 5.2 archive change，archive 后重新运行 OpenSpec changes/specs strict。
- [x] 5.3 收敛为单个 change commit，push 工作分支，保持 `test` 未 push/merge，并更新 `threads.md`。
