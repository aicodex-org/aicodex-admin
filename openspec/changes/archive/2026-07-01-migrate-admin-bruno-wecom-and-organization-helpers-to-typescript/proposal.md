## Why

Bruno Admin helper 中 WeCom source 与 organization tree operations 的本地只读交接脚本仍是纯 JavaScript，后续维护 alias、owner handoff、redaction 和 fail-closed 边界时缺少 TypeScript 源级约束。
本批在不改变 helper 业务语义的前提下迁移这两个内聚范围，为后续 Bruno helper TypeScript 批次保留可复现的 TS 源到 CommonJS JS 入口生成链路。

## What Changes

- 将 `api-tests/bruno/aicodex-admin/scripts/wecomSource*.js` 与 `wecomSource*.test.js` 建立对应 TypeScript 源文件，并保留同名 CommonJS `.js` 入口供现有 Bruno/node:test 流程使用。
- 将 `api-tests/bruno/aicodex-admin/scripts/organizationTreeOperations*.js` 与 `organizationTreeOperations*.test.js` 建立对应 TypeScript 源文件，并保留同名 CommonJS `.js` 入口。
- 增加本批专属 TypeScript 配置和局部 Node/CommonJS 类型声明，使用已有 `web-admin/node_modules/typescript` 进行静态检查与 JS 输出一致性验证。
- 不迁移 `gatewayProjection*`、不修改 `api-tests/bruno/aicodex-admin/README.md`、不触碰 `web-admin/**`、public raw scripts、build tooling、Cypress 或 Swagger vendor JS。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `wecom-organization-sync`: WeCom source 本地只读 Bruno helper SHALL 支持以 TypeScript 源维护，并通过生成的 CommonJS JS 入口保持现有 helper/test 行为兼容。
- `admin-organization-tree-operations`: Organization tree operations 本地只读 Bruno helper SHALL 支持以 TypeScript 源维护，并通过生成的 CommonJS JS 入口保持现有 helper/test 行为兼容。

## Impact

- Affected code: `api-tests/bruno/aicodex-admin/scripts/wecomSource*.ts/.js/.test.ts/.test.js`、`organizationTreeOperations*.ts/.js/.test.ts/.test.js`、本批专属 `tsconfig` 与局部类型声明。
- Affected validation: 目标 helper 的 `node --test` baseline/final、TypeScript no-emit/emit 生成、生成后一致性检查、OpenSpec strict validation、`git diff --check`。
- No production dependencies, runtime configuration, 60 环境、DB、fixture、真实 WeCom/OIDC/Gateway/API/Insight 调用或 secrets handling are changed.
