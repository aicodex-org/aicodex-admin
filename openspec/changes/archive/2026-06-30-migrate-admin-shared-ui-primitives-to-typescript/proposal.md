## Why

`web-admin` 已经开始按页面和业务域渐进迁移 TypeScript，但多处共享 UI primitives、select/modal/table 小组件仍停留在 legacy JavaScript。后续页面迁移继续依赖这些动态边界，会让 props、行数据、选择项和弹窗回调类型重复在页面侧补洞，增加迁移成本和回归风险。

本 change 先批量迁移低风险共享组件，保持现有 UI 和业务语义不变，为后续页面迁移提供更稳定的 TS/TSX 组件边界。

## What Changes

- 将 `web-admin/src/common/select/*.js` 低风险选择器迁移为 `.tsx`，并迁移对应测试。
- 将 `web-admin/src/common/modal/*.js` 弹窗组件迁移为 `.tsx`，保留确认、取消、提交、加载和错误展示语义。
- 将 `web-admin/src/common/table/*.js` 表格分页小组件迁移为 `.tsx`，并迁移对应测试。
- 将 `web-admin/src/common/*.js` 中低耦合 UI primitives 迁移为 `.tsx`，包括验证码、OAuth/SAML 展示组件、密码检查、分页选择、重定向表单、测试组件、树组件、Tour、编辑器、Github corner、Casdoor app connector 等。
- 将 `web-admin/src/table/*.js` 中低耦合配置表组件迁移为 `.tsx`，包括地址、属性映射、同意项、自定义 scope、表单项、HTTP header、登录/注册、scope、SAML attribute、URL、Webhook header、WebAuthn credential、Token attribute 等。
- 如迁移中发现某个组件会牵出 Provider、Syncer、认证回调、页面级业务行为或高成本类型洞，记录为 deferred，继续完成其它低风险组件。
- 可新增小型共享窄类型文件，例如 `common/CommonComponentTypes.ts` 或 `table/TableTypes.ts`，仅用于减少重复 props/row 类型，不抽象新的 UI 框架。

## Non-Goals

- 不迁移页面、认证主流程、Provider 主表、Syncer 表格、后端 wrapper、`Application`/`Syncer`/`Management`/`App`/`Setting`/`BaseListPage`。
- 不修改选择器后端查询、弹窗确认、表格行编辑、上传下载、删除禁用、Tour/config 或任何用户可见业务语义。
- 不调整视觉样式、交互布局、i18n 文案、权限、API path、payload shape、真实认证链路或生产/类生产配置。
- 不 push 或 merge `test`。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加共享 UI primitives、select/modal/table 小组件的批量 TypeScript 迁移要求、边界和验证门禁。

## Impact

- Affected frontend components:
  - `web-admin/src/common/select/*`
  - `web-admin/src/common/modal/*`
  - `web-admin/src/common/table/*`
  - `web-admin/src/common/*` 中本 change 实际迁移的低耦合组件
  - `web-admin/src/table/*` 中本 change 实际迁移的低耦合配置表组件
- Affected tests:
  - `OrganizationSelect.test`
  - `NavItemTree.test`
  - `TablePagination.test`
  - 其它随实现触碰的 existing focused tests
- Validation:
  - `openspec validate migrate-admin-shared-ui-primitives-to-typescript --strict`
  - `git diff --check origin/hfl-test-base..HEAD`
  - focused Jest for touched tests
  - `yarn typecheck`
  - `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - `yarn build`
