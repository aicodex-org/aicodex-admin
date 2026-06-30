## 1. OpenSpec

- [x] 1.1 创建 `migrate-admin-table-residual-components-to-typescript` change，补齐 proposal、design、tasks 和 `web-admin-incremental-typescript` spec delta。
- [x] 1.2 完成实施前 review，确认范围只覆盖 residual table 组件和可选 `ProviderTable` 测试。

## 2. 表组件迁移

- [x] 2.1 将账号与托管账号表 `AccountTable`、`ManagedAccountTable` 迁移为 `.tsx`，补齐局部 props/row/callback 类型。
- [x] 2.2 将 MFA 表 `MfaTable`、`MfaAccountTable` 迁移为 `.tsx`，保持添加、删除、更新和禁用状态行为兼容。
- [x] 2.3 将登录方式、LDAP、FaceID 表 `SigninMethodTable`、`LdapTable`、`FaceIdTable` 迁移为 `.tsx`，保持字段回写和删除语义兼容。
- [x] 2.4 将 `PrometheusInfoTable` 和小写 `propertyTable` 迁移为 `.tsx`，保持现有大小写导入和动态属性行为兼容。
- [x] 2.5 评估并尽量迁移 `ProviderTable` / `ProviderTable.test`；如牵出 Provider 编辑或字段行为，记录 deferred。

## 3. 验证与 closeout

- [x] 3.1 运行 `openspec validate migrate-admin-table-residual-components-to-typescript --strict` 和 `git diff --check origin/hfl-test-base..HEAD`。
- [x] 3.2 真实运行 touched focused Jest；若触碰 `ProviderTable.test`，必须包含该 suite。没有现成测试的表组件记录测试缺口，不接受 `0 tests`。
- [x] 3.3 运行 `yarn typecheck`、增量 TypeScript gate 和 `yarn build`。
- [x] 3.4 记录验证结果、coverage 口径、deferred files 和剩余风险；归档 OpenSpec、同步主规格、整理为单 commit，按 self-closeout 推送 `hfl-test-base` 并删除工作分支，不 push/merge `test`。
