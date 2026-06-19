## Why

“组织账号”菜单的列表页和编辑页正在按增量 TypeScript 路线拆分迁移，组织树运营页仍是历史 JS 页面和 JS backend wrapper。该页面已有较完整的只读诊断/刷新/成员抽屉测试，适合单独迁移为 TSX/TS，继续降低后续身份控制台前端维护成本。

## What Changes

- 将 `web-admin/src/OrganizationTreeOperationsPage.js` 保守迁移为 `OrganizationTreeOperationsPage.tsx`。
- 将 `web-admin/src/backend/OrganizationTreeOperationsBackend.js` 迁移为 `OrganizationTreeOperationsBackend.ts`，补充页面使用的请求/响应局部类型。
- 将对应 React 测试迁移为 `OrganizationTreeOperationsPage.test.tsx`，覆盖既有诊断、刷新、筛选、树/表视图、成员抽屉、错误/空态行为。
- 保持 `/organization-tree-operations` 路由、权限、用户可见文案、API path、请求参数、响应处理和页面交互行为不变。
- 不迁移 `OrganizationDirectoryQualityPage`、组织/用户/群组编辑页、全局 `Setting`、共享 AntD 组件或后端 Go 实现。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`：补充“组织账号”菜单下组织树运营页的保守 TSX/TS 迁移要求和验证场景。

## Impact

- 前端页面：`web-admin/src/OrganizationTreeOperationsPage.js` -> `.tsx`。
- 前端 API wrapper：`web-admin/src/backend/OrganizationTreeOperationsBackend.js` -> `.ts`。
- 前端测试：`web-admin/src/OrganizationTreeOperationsPage.test.js` -> `.test.tsx`。
- OpenSpec：新增本 change delta，并在 archive 后同步 `web-admin-incremental-typescript` 主规格。
- 不涉及后端 API、数据库、真实组织数据、认证/OAuth/OIDC、Provider、Gateway、Insight 或 `test` 分支。
