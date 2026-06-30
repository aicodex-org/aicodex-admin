## Why

`web-admin/src/backend` 仍保留较多 legacy JavaScript API wrapper，后续页面迁移到 TSX 时会反复遇到动态响应、分页、owner/name/id 等边界不清的问题。先批量迁移 backend wrapper，可以把 API 边界收敛到更稳定的 TS/JS 共存层，降低后续页面迁移成本。

## What Changes

- 将 `web-admin/src/backend/*.js` 中仍属于后台 API wrapper 的文件批量迁移为 `.ts`。
- 将触碰的 backend 测试迁移为 `.test.ts`，并保持真实 Jest suite/test 继续通过。
- 新增或复用窄类型描述通用 backend response、record、pagination/filter、owner/name/id 等动态边界。
- 保持 HTTP method、URL、query/body shape、错误处理、默认导出/具名导出和后端 API 契约不变。
- 明确不迁 `web-admin/src/auth/AuthBackend.js`、页面组件、Provider 配置、Application/Syncer 页面、common/table/select/modal、`ManagementPage`、`App`、`Setting`、`BaseListPage`。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin-incremental-typescript`: 补充 Admin backend API wrapper 批量迁移到 `.ts` 的要求、边界和验证门禁。

## Impact

- Affected code: `web-admin/src/backend/*` wrappers and backend-focused tests.
- Affected validation: OpenSpec strict validate, backend focused Jest, `yarn typecheck`, incremental TypeScript gate, `yarn build`.
- No backend API contract, route, visual UI, auth owner, Provider config, Application/Syncer page, or production/test branch behavior change.
