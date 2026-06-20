## Why

“权限角色”菜单的低风险页面已按增量 TypeScript 路线推进到 Casbin 模型、角色/权限列表、角色/权限编辑和 Casbin 适配器 release candidate。剩余的 `Casbin执行器` 页面比前序页面风险更高：编辑页内嵌 `PolicyTable`，而 `PolicyTable` 直接通过 `AdapterBackend` 执行 policy CRUD，不能在没有明确边界前按普通列表/编辑页迁移处理。

## What Changes

- 评估 `EnforcerListPage.js`、`EnforcerEditPage.js`、`table/PolicyTable.js`、`backend/EnforcerBackend.js` 和 `backend/AdapterBackend.js` 的迁移边界。
- 固化后续迁移拆分决策：`EnforcerListPage` 可作为独立低风险列表页迁移候选；`EnforcerEditPage` 与 `PolicyTable` 应作为单独高风险 change 共同设计和验证。
- 明确后续迁移必须保持 `/enforcers`、`/enforcers/:organizationName/:enforcerName`、model/adapter 选择、policy 同步、policy 新增/编辑/删除、内置对象保护和现有 API payload 兼容。
- 本 change 不迁移生产代码、不修改后端 API、不修改 `AdapterBackend.js`、不改变 policy CRUD 或 Casbin 执行语义。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加权限角色菜单 Casbin 执行器和 `PolicyTable` 的渐进 TSX 迁移评估规则，明确拆分边界、后续迁移顺序和高风险验证要求。

## Impact

- 影响 OpenSpec 文档和主规格中的渐进 TypeScript 迁移路线说明。
- 只读审查 `web-admin/src/EnforcerListPage.js`、`web-admin/src/EnforcerEditPage.js`、`web-admin/src/table/PolicyTable.js`、`web-admin/src/backend/EnforcerBackend.js` 和 `web-admin/src/backend/AdapterBackend.js`。
- 不改 `web-admin` 生产源码、测试、后端、权限模型、真实策略数据、认证/OIDC、Gateway、Insight 或真实环境配置。
