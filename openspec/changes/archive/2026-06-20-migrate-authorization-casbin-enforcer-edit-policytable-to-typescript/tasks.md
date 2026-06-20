## 1. OpenSpec 与实施前门禁

- [x] 1.1 从最新 `origin/hfl-test-base` 创建 `hfl-test/migrate-authorization-casbin-enforcer-edit-policytable-to-typescript`，确认工作区 clean 且不叠加其它 release candidate。
- [x] 1.2 创建 proposal/design/tasks/spec delta，并运行 `openspec validate migrate-authorization-casbin-enforcer-edit-policytable-to-typescript --strict`。
- [x] 1.3 完成 `openspec-pre-implementation-review`，确认 scope、写集、风险和验证计划无 Blocking/Fixable。

## 2. TSX 迁移

- [x] 2.1 将 `web-admin/src/table/PolicyTable.js` 重命名为 `PolicyTable.tsx`，补充 props/state、policy row、modelCfg、table columns、backend response 和分页 index 类型。
- [x] 2.2 将 `web-admin/src/EnforcerEditPage.js` 重命名为 `EnforcerEditPage.tsx`，补充 route props/state、执行器、组织、model、adapter 和保存/删除 response 类型。
- [x] 2.3 保持 `ManagementPage.js`、`EnforcerEditPage` 对无后缀 import 的语义不变，不迁移 backend wrappers 或其它权限角色页面。

## 3. 测试

- [x] 3.1 新增执行器编辑页与策略表 `.test.tsx`，不新增 `.js/.jsx` 测试。
- [x] 3.2 覆盖 `PolicyTable` TSX 文件存在、原 `.js` 不再解析、sync policies、动态列、分页 index 映射、edit/cancel rollback、add/save duplicate policy、update policy、delete policy 和 disabled states。
- [x] 3.3 覆盖 `EnforcerEditPage` 执行器加载、组织/model/adapter 加载、字段更新、保存、保存并退出、保存失败回滚 name、取消新增删除和 null-safe render。
- [x] 3.4 记录 changed-file / changed-function coverage，重点关注迁移文件和新增测试。

## 4. 验证、归档与回传

- [x] 4.1 运行 `openspec validate migrate-authorization-casbin-enforcer-edit-policytable-to-typescript --strict`、`openspec validate --changes --strict`、`openspec validate --specs --strict` 和 `git diff --check`。
- [x] 4.2 在 `web-admin` 运行 `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、`yarn typecheck`、focused Jest tests/coverage。
- [x] 4.3 运行 `yarn build` 并记录 warning。
- [x] 4.4 补充 `verification.md`，完成 `openspec-pre-archive-review` 并修复发现的问题。
- [x] 4.5 archive change，archive 后重新运行 specs/changes strict 和 diff check。
- [x] 4.6 收敛为 `origin/hfl-test-base + 1 个本 change commit`，push 工作分支；未获 `self-closeout=true` 时不合入 `hfl-test-base`、不删除工作分支、不 push/merge `test`，并写 vault report。
