## 1. OpenSpec 与实施前门禁

- [x] 1.1 从最新 `origin/hfl-test-base` 创建 `hfl-test/migrate-authorization-role-permission-edit-pages-to-typescript`，确认工作区 clean 且 active changes 写集不冲突。
- [x] 1.2 创建 proposal/design/tasks/spec delta，并运行 `openspec validate migrate-authorization-role-permission-edit-pages-to-typescript --strict`。
- [x] 1.3 完成 `openspec-pre-implementation-review`，确认 scope、写集、风险和验证计划无 Blocking/Fixable。

## 2. TDD 与 TSX 迁移

- [x] 2.1 新增角色/权限编辑页 focused `.test.tsx`，先确认测试因 `.tsx` 文件不存在或迁移行为缺失而 RED。
- [x] 2.2 将 `web-admin/src/RoleEditPage.js` 重命名为 `RoleEditPage.tsx`，补充 props、route params、state、role record、organization/user/group/role 选择项、field update、save/delete response 类型，保持编辑行为不变。
- [x] 2.3 将 `web-admin/src/PermissionEditPage.js` 重命名为 `PermissionEditPage.tsx`，补充 props、route params、state、permission record、model/application resource/user/group/role 选择项、field update、validation、approval state、save/delete response 类型，保持编辑行为不变。
- [x] 2.4 确认 `ManagementPage.js` 无后缀 import 和 `/roles/:organizationName/:roleName`、`/permissions/:organizationName/:permissionName` 路由语义不变，且不迁移列表页、适配器、执行器或 `PolicyTable`。

## 3. 测试覆盖

- [x] 3.1 覆盖 `RoleEditPage` 加载、字段更新、保存、保存并退出、取消新增和删除关键路径。
- [x] 3.2 覆盖 `PermissionEditPage` 加载、模型加载、Application 资源加载、字段更新、保存、保存并退出、取消新增、删除、普通用户 submitter 限制和必填校验关键路径。
- [x] 3.3 覆盖权限编辑审批状态切换、本地管理员与普通用户分支、资源类型分支和错误提示。
- [x] 3.4 记录 changed-file / changed-function coverage，重点关注迁移文件和新增测试。

## 4. 验证、归档与收口

- [x] 4.1 运行 `openspec validate migrate-authorization-role-permission-edit-pages-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict` 和 `git diff --check`。
- [x] 4.2 在 `web-admin` 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、`yarn typecheck`、focused Jest tests/coverage。
- [x] 4.3 若路由/import/build-time 行为受影响，运行 `yarn build` 并记录 warning。
- [x] 4.4 补充 `verification.md`，完成 `openspec-pre-archive-review` 并修复发现的问题。
- [x] 4.5 archive change，archive 后重新运行 specs/changes strict 和 diff check。
- [ ] 4.6 收敛为 `origin/hfl-test-base + 1 个本 change commit`，push 工作分支；若 closeout mode 获得明确授权，再 ff-only push `hfl-test-base`、删除工作分支并确认 workspace clean。严禁 push/merge `test`。
