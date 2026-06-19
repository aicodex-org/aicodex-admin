## 1. OpenSpec 与范围确认

- [x] 1.1 完成 proposal、design、tasks 和 `web-admin-incremental-typescript` spec delta。
- [x] 1.2 运行目标 change strict validate、全部 active changes strict 和 `git diff --check`，完成实施前 review。

## 2. 页面迁移实现

- [x] 2.1 将 `web-admin/src/UserEditPage.js` 迁移为 `UserEditPage.tsx`，保留 `withRouter(UserEditPage)` 默认导出、路由使用方式和 class component 行为。
- [x] 2.2 为页面 props、state、用户记录、组织/应用/群组记录、交易记录、MFA/consent 数据和通用 backend 响应补充局部 TypeScript 类型。
- [x] 2.3 处理历史 JS 子组件、modal、table、OAuth/SAML widget 和 backend 导入的兼容类型边界，避免迁移无关依赖链。

## 3. 聚焦测试

- [x] 3.1 新增 `UserEditPage.test.tsx`，覆盖用户加载成功、用户不存在跳转、接口错误提示、分组可见性和交易记录展示。
- [x] 3.2 覆盖保存成功/失败、保存退出的 returnUrl/userListUrl 跳转、删除成功/失败和新增模式取消。
- [x] 3.3 覆盖关键资料字段更新、地址字段更新、实名认证校验、MFA 删除和 WeCom 同步后账户刷新回调。

## 4. 验证

- [x] 4.1 运行 `openspec validate migrate-organization-user-edit-page-to-typescript --strict`、`openspec validate --changes --strict` 和 `git diff --check`。
- [x] 4.2 在 `web-admin` 下运行增量 TypeScript gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build`。
- [x] 4.3 在 `verification.md` 记录命令、结果、changed-file coverage、标准 Jest path 限制和剩余风险。

## 5. 归档与收口

- [x] 5.1 完成归档前 review 并修复阻塞问题。
- [x] 5.2 archive change，archive 后重新运行 OpenSpec changes/specs strict。
- [ ] 5.3 收敛为单个 change commit，push 工作分支，保持 `test` 和 `hfl-test-base` 未 push/merge，并更新 `threads.md`。
