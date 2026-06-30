## Why

`api-tests/bruno/aicodex-admin/scripts` 下的 Gateway projection 交接 helper 仍是大块 CommonJS JavaScript。它们承担 release、operator handoff、evidence guardrail 等安全边界，但缺少可类型检查的源文件，后续维护 alias、脱敏和 fail-closed 规则时容易继续扩大动态边界。

## What Changes

- 将 Gateway projection controlled smoke / release / operator handoff 系列 Bruno helper 建立为 TypeScript 源文件，并保留现有 Node/Bruno 可直接消费的 CommonJS `.js` 入口。
- 增加可重复的本地生成/校验方式，证明提交的 `.js` 入口由对应 `.ts` 源生成，避免手工漂移。
- 保持现有 `node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjection*.test.js` 入口兼容，真实跑完既有 Gateway projection helper 测试。
- 本轮不迁移 WeCom source helper 批次，不改变 helper 业务语义、稳定 alias、owner handoff、redaction、fail-closed、red-line 或 README 安全边界。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-gateway-organization-projection-publisher`: 增加 Gateway projection Bruno handoff helper 的 TypeScript 源化与 CommonJS 入口兼容要求，确保本地 helper 迁移不改变 Admin-owned Gateway projection evidence / handoff 边界。

## Impact

- Affected code: `api-tests/bruno/aicodex-admin/scripts/gatewayProjection*.js`、对应 `gatewayProjection*.test.js`、以及必要的本地生成/校验脚本。
- Affected docs: OpenSpec change artifacts；README 仅在需要说明生成/校验入口时最小更新。
- APIs/dependencies: 不改后端 API、Bruno request、环境配置、真实 60 环境、DB、fixture 或生产依赖；TypeScript 编译优先复用仓库已有工具链或本地脚本边界。
- Systems: 不触碰 `web-admin/**`、Cypress、public auth scripts、web build tooling、`test` 分支或无关 active OpenSpec changes。
