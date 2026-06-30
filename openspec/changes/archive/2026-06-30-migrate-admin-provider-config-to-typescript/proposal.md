## Why

Provider 配置页和各类 Provider 字段组件仍集中在 legacy JavaScript 中，后续维护 OAuth/OIDC、WeCom、Lark 等配置链路时需要在 JS/TS 混合边界反复补上下文。现在按渐进 TypeScript 路线迁移该页和字段组件，可以降低 Provider 主链路维护成本，同时保持现有配置保存与登录相关契约不变。

## What Changes

- 将 `web-admin/src/ProviderEditPage.js` 及其低风险触碰测试迁移为 `.tsx` / `.test.tsx`。
- 将 `web-admin/src/provider/*ProviderFields.js`、`LarkProviderGuide.js`、`LarkProviderUtils.js`、`WeComProviderUtils.js` 迁移为 `.tsx` / `.ts`，并迁移触碰的聚焦测试。
- 为 Provider 记录、动态字段更新、字段渲染回调、Lark/WeCom helper 返回值补充局部 TypeScript 类型。
- 保持 `ManagementPage` 等调用方的无后缀 import 兼容。
- 不修改 OAuth/OIDC/WeCom/Lark 登录行为、授权 URL、回调参数、Provider 可见性、字段保存语义或后端 API 契约。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加 Provider 配置页和 Provider 字段组件的渐进 TypeScript 迁移约束与验证要求。

## Impact

- Affected code: `web-admin/src/ProviderEditPage.*` and `web-admin/src/provider/*ProviderFields.*`, `LarkProviderGuide.*`, `LarkProviderUtils.*`, `WeComProviderUtils.*`.
- Affected validation: OpenSpec strict validation, focused Jest tests for touched Provider files, `yarn typecheck`, incremental TypeScript gate, and `yarn build`.
- No backend API, package dependency, routing, authentication, authorization, OAuth/OIDC provider contract, or production configuration changes.
