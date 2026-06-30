## Why

`web-admin/src` 的 auth 目录已经完成 TypeScript 收尾，但 `web-admin/public/AuthCallbackHandler.js` 和 `web-admin/public/ProviderHintRedirect.js` 仍是登录链路中的 raw JavaScript。它们直接处理 callback、provider hint redirect、storage 和 redirect 契约，继续以无类型源码维护会增加登录链路回归风险。

## What Changes

- 为 `AuthCallbackHandler.js` 和 `ProviderHintRedirect.js` 建立 TypeScript 源文件，作为后续维护入口。
- 新增最小 public scripts 生成/校验链路，由 TS 源稳定生成原 `web-admin/public/*.js` 文件。
- 保持最终 served 路径不变：`/AuthCallbackHandler.js` 和 `/ProviderHintRedirect.js`。
- 保持 OAuth/OIDC/SAML/CAS/WeCom/Web3 callback、query/hash/storage/postMessage/redirect 行为语义不变。

## Capabilities

### New Capabilities

### Modified Capabilities

- `web-admin-incremental-typescript`: 增加 public auth raw scripts 的 TypeScript 源和生成链路要求。

## Impact

- 影响 public raw scripts：`web-admin/public/AuthCallbackHandler.js`、`web-admin/public/ProviderHintRedirect.js`。
- 影响新增 TS 源和专用 tsconfig/生成脚本；不新增生产依赖。
- 可能影响 `web-admin/package.json` scripts，用于显式生成/验证 public auth scripts。
- 不触碰 `web-admin/src/auth/*`、`web-admin/src/table/*`、`web-admin/cypress/*`、`common/*`、OrganizationEdit、Provider/Application/Syncer/backend/root shell。
