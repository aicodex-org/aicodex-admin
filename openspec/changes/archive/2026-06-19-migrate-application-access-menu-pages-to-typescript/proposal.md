## Why

“应用接入”菜单下仍有多个二级菜单落地页停留在历史 `.js`，与当前 Admin 前端渐进 TypeScript 路线不一致。前一 change 只迁移了 `/applications` 中的 `ApplicationAccessCenter` 摘要区，本 change 需要把截图中应用接入一级菜单下的二级菜单落地页继续迁移到 TS/TSX，避免后续新能力继续堆在旧 JS 页面上。

## What Changes

- 将应用接入一级菜单下仍为 `.js` 的二级菜单落地页迁移为 `.tsx`：
  - `/applications` 的 `ApplicationListPage`
  - `/resources` 的 `ResourceListPage`
  - `/certs` 的 `CertListPage`
  - `/keys` 的 `KeyListPage`
  - `/platform-api-mappings` 的 `PlatformApiMappingPage`
  - `/webhooks` 的 `WebhookListPage`
  - `/webhook-events` 的 `WebhookEventListPage`
- 保留已经是 TSX 的 `/applications` 摘要区 `ApplicationAccessCenter` 和 `/access-wizard` 的 `AccessWizardPage`，只在必要时调整导入或测试兼容。
- 将本次触碰且包含 JSX 的页面测试迁移为 `.test.tsx`，并按页面风险补充聚焦测试。
- 保持现有路由、权限、接口、表格列、分页筛选排序、操作按钮、文案、敏感信息脱敏和运行边界不变。
- 不迁移应用、证书、密钥、Webhook 的编辑页，不迁移后端 API client，不修改认证/OIDC/Gateway/真实密钥/生产配置，不触碰 `test` 分支。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加应用接入一级菜单下二级菜单落地页的渐进 TypeScript 迁移场景和验证要求。

## Impact

- Affected frontend pages:
  - `web-admin/src/ApplicationListPage.js`
  - `web-admin/src/ResourceListPage.js`
  - `web-admin/src/CertListPage.js`
  - `web-admin/src/KeyListPage.js`
  - `web-admin/src/PlatformApiMappingPage.js`
  - `web-admin/src/WebhookListPage.js`
  - `web-admin/src/WebhookEventListPage.js`
- Affected tests:
  - `web-admin/src/ApplicationListPage.test.tsx`
  - `web-admin/src/PlatformApiMappingPage.test.js`
  - 以及本 change 为缺少测试的迁移页面新增的聚焦 `.test.tsx`。
- Validation:
  - OpenSpec target/changes/specs strict validation
  - `git diff --check`
  - `web-admin` incremental TypeScript gate
  - `yarn typecheck`
  - focused Jest coverage for migrated pages
  - `yarn build`
