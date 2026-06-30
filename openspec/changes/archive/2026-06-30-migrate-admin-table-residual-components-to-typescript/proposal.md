## Why

Admin 前端大部分高扇出壳层和业务页面已经进入渐进 TypeScript 迁移，但 `web-admin/src/table` 下仍有一批账号、MFA、LDAP、FaceID、登录方式和配置属性表组件停留在 legacy JavaScript。它们被设置页、组织账号页和认证配置链路复用，继续保留 JS 会增加后续页面迁移的类型洞和 JS/TS 混合成本。

本 change 聚焦剩余高价值 table residual 组件的机械 TSX 迁移，不重做表格行为、不改变 provider row mapping、账号/MFA/LDAP/FaceID 语义或后端 API 契约。

## What Changes

- 将 `web-admin/src/table` 下指定 residual 表组件迁移为 `.tsx`：
  - `AccountTable`
  - `ManagedAccountTable`
  - `MfaTable`
  - `MfaAccountTable`
  - `SigninMethodTable`
  - `LdapTable`
  - `FaceIdTable`
  - `PrometheusInfoTable`
  - `propertyTable`
- 视类型牵引情况迁移 `ProviderTable` 和 `ProviderTable.test`；如果牵出 Provider 编辑/字段行为或测试成本过大，则记录 deferred，不阻塞其它表组件。
- 使用局部 props、row、callback、dynamic field 类型封住历史动态字段，保持现有 extensionless import 和大小写路径兼容。
- 不改表格新增、删除、排序、行编辑、provider row mapping、账号/MFA/LDAP/FaceID 业务语义，不改后端 API 契约。
- 不触碰 `common/*`、`SyncerTableColumnTable*`、Application/Syncer/ProviderEditPage、auth、backend、root shell/config、basic/entry/account/pricing/Iframe/Tool/Tour 等并行写集。

## Capabilities

### New Capabilities
- 无。

### Modified Capabilities
- `web-admin-incremental-typescript`: 增加 Admin table residual 组件渐进 TSX 迁移和验证要求。

## Impact

- Affected code:
  - `web-admin/src/table/AccountTable.js` -> `.tsx`
  - `web-admin/src/table/ManagedAccountTable.js` -> `.tsx`
  - `web-admin/src/table/MfaTable.js` -> `.tsx`
  - `web-admin/src/table/MfaAccountTable.js` -> `.tsx`
  - `web-admin/src/table/SigninMethodTable.js` -> `.tsx`
  - `web-admin/src/table/LdapTable.js` -> `.tsx`
  - `web-admin/src/table/FaceIdTable.js` -> `.tsx`
  - `web-admin/src/table/PrometheusInfoTable.js` -> `.tsx`
  - `web-admin/src/table/propertyTable.js` -> `.tsx`
  - optional: `web-admin/src/table/ProviderTable.js` and `ProviderTable.test.js`
- Affected specs: `web-admin-incremental-typescript`
- 不涉及后端、数据库、真实认证链路、Provider/Application/Syncer 编辑页、shared common widgets、root shell/config 或 `test` 分支。
