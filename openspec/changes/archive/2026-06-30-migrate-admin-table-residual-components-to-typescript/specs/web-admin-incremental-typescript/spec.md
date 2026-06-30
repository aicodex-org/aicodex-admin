## ADDED Requirements

### Requirement: Admin table residual 组件 TSX 迁移
Admin 前端 SHALL 支持将 `web-admin/src/table` 下剩余高价值账号、认证、配置 residual 表组件从 legacy JavaScript 渐进迁移为 `.tsx`，并保持现有 JS/TS 共存、extensionless import、文件名大小写兼容和用户可见表格行为兼容。

#### Scenario: residual table 文件迁移
- **WHEN** residual table 组件被迁移
- **THEN** `AccountTable`、`ManagedAccountTable`、`MfaTable`、`MfaAccountTable`、`SigninMethodTable`、`LdapTable`、`FaceIdTable`、`PrometheusInfoTable` 和 `propertyTable` SHALL 使用 `.tsx`
- **AND** `propertyTable` SHALL 保持小写文件名以兼容既有导入
- **AND** migrated components SHALL continue being imported through existing extensionless paths

#### Scenario: residual table 行为保持兼容
- **WHEN** 管理员或页面组件使用迁移后的账号、MFA、LDAP、FaceID、登录方式、Prometheus 信息或属性配置表
- **THEN** 表格行新增、删除、排序、字段编辑、字段回写、disabled 状态、provider row mapping 和父组件 callback 调用 SHALL 与迁移前保持兼容
- **AND** 迁移 SHALL NOT 修改后端 API path、HTTP method、payload shape、权限、i18n 文案、Provider/Application/Syncer 编辑页、auth、backend、root shell/config 或 `test` 分支

#### Scenario: ProviderTable 可保守 deferred
- **WHEN** `ProviderTable` 迁移牵出 Provider 编辑页、Provider 字段组件、真实认证配置、Provider owner 边界或高成本测试 fixture 重塑
- **THEN** `ProviderTable` MAY 被记录为 deferred
- **AND** deferred SHALL NOT 阻塞其它 residual table 组件完成迁移和验证
- **AND** if `ProviderTable` or `ProviderTable.test` are touched, focused Jest SHALL include `ProviderTable.test` with real suites/tests

#### Scenario: residual table 迁移验证
- **WHEN** Admin table residual TSX 迁移准备收口
- **THEN** OpenSpec strict validation、`git diff --check`、touched focused Jest、`yarn typecheck`、增量 TypeScript gate 和 `yarn build` SHALL pass
- **AND** 若多数 residual table 组件没有现成 Jest suite，验证记录 SHALL 明确说明测试缺口，并 SHALL NOT use `0 tests` as validation evidence
- **AND** 验证记录 SHALL list deferred files and SHALL NOT include token、secret、Cookie、client secret、私有 URL、个人邮箱、手机号或其它敏感字段原值
