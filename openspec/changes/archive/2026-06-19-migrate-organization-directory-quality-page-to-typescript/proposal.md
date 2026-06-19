## Why

“组织账号”菜单的主要列表、编辑和组织树运营页已经按增量 TypeScript 路线合入 `hfl-test-base`。目录质量页仍是较大的历史 JS 页面和 JS 测试文件，继续保留会让后续目录诊断、修复预览和质量审计改动缺少类型保护。

## What Changes

- 将 `web-admin/src/OrganizationDirectoryQualityPage.js` 保守迁移为 `OrganizationDirectoryQualityPage.tsx`。
- 将对应 React 测试 `OrganizationDirectoryQualityPage.test.js` 迁移为 `.test.tsx`。
- 在页面内补充 props、筛选 state、分页、诊断摘要、质量项、修复计划、action draft、preflight、审批预览、审计和 operator note readiness 等局部类型。
- 保持 `/organization-directory-quality` 路由、权限、文案、OrganizationSelect 行为、API 调用、分页筛选、导出、详情 Drawer、错误态和空态行为不变。
- 不迁移共享且较大的 `PlatformApiMappingBackend.js`，只在页面调用边界做局部类型收窄。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`：补充“组织账号”菜单下组织目录质量页的保守 TSX 迁移要求和验证场景。

## Impact

- 前端页面：`web-admin/src/OrganizationDirectoryQualityPage.js` -> `.tsx`。
- 前端测试：`web-admin/src/OrganizationDirectoryQualityPage.test.js` -> `.test.tsx`。
- OpenSpec：新增本 change delta，并在 archive 后同步 `web-admin-incremental-typescript` 主规格。
- 不涉及后端 Go、数据库、真实组织数据、认证/OAuth/OIDC、Provider、Gateway、Insight、生产配置或 `test` 分支。
