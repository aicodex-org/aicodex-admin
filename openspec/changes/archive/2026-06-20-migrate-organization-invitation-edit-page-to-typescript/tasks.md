## 1. OpenSpec 与实施前门禁

- [x] 1.1 创建 `migrate-organization-invitation-edit-page-to-typescript` change，补齐 proposal、design、tasks 和 spec delta。
- [x] 1.2 完成实施前 review，确认范围仅覆盖邀请码编辑页 TSX 迁移和对应测试。
- [x] 1.3 运行 target OpenSpec strict、changes strict 和 `git diff --check`，确认可进入实现。

## 2. 前端迁移

- [x] 2.1 将 `web-admin/src/InvitationEditPage.js` 迁移为 `InvitationEditPage.tsx`，保留 class 组件结构和现有 lifecycle。
- [x] 2.2 补齐页面局部类型，覆盖 props、route params、state、邀请码记录、组织记录、应用记录、群组记录、选择项和 API response。
- [x] 2.3 保持 `/invitations/:organizationName/:invitationName` 路由、权限、文案、后端调用、复制注册链接、发送邀请、保存/保存并退出、取消新增和删除行为不变。

## 3. 测试与覆盖

- [x] 3.1 新增 `InvitationEditPage.test.tsx`，覆盖加载、404、组织切换、字段更新、复制注册链接、发送邀请、保存成功/失败、保存并退出、取消新增、删除失败和网络错误。
- [x] 3.2 记录 changed-file coverage；若 statements/functions/lines 未达到 85%，说明缺口和补救路径。

## 4. 验证、归档与收口

- [x] 4.1 运行 target OpenSpec validate、`openspec validate --changes --strict`、`openspec validate --specs --strict` 和 `git diff --check`。
- [x] 4.2 在 `web-admin` 下运行增量 TS gate、`yarn typecheck`、聚焦 Jest/coverage 和 `yarn build`。
- [x] 4.3 补充 `verification.md`，记录命令、结果、覆盖率、已知 warning 和剩余风险，并清理 build/coverage 产物。
- [x] 4.4 完成归档前 review；无 Blocking/Fixable 后 archive change，并再次验证 changes/specs strict。
- [x] 4.5 收敛为一个 change commit，显式 push 工作分支，ff-only 合入并 push `origin/hfl-test-base`，删除工作分支；不 push/merge `test`。
