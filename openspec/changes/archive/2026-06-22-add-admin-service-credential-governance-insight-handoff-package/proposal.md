## Why

Insight `业务服务接入` 和 API-Gateway owner 需要一份由 Admin owner 生成的 copy-safe 服务凭据治理摘要，用于判断 Admin 侧 trust、caller policy、credential reference、keep-in-env 和 cannot-infer runtime truth，而不是手工翻 `.env` 或私有 YAML。

现有 `/applications` 已有服务凭据治理 status/config/save/readback/diagnostic 能力，但缺少可交给下游 owner 消费的稳定 handoff package。

## What Changes

- 在 `应用接入 / 服务凭据治理` 内新增“生成/查看交接包”动作，展示紧凑预览，不新增菜单或泛配置中心。
- 在前端服务层新增 `serviceCredentialGovernanceHandoffPackage` 生成契约，复用保存后的 copy-safe config、status 和可选 diagnostic 摘要。
- handoff package 输出 schema/version、source、generatedAt、target consumer alias、Admin owner alias、groups[]、readiness/status、sourceClass、credential reference 安全摘要、caller policy、bounded runtime policy、keep-in-env、cannot-infer runtime truth、owner hint、next action 以及 blocked/stable aliases。
- fail-closed 表达 `env_config`、`keepInEnv`、missing reference、disabled/blocked group、external unresolved reference、unsupported source class 和 cannot-infer runtime truth，避免被下游误判为 ready/full success。
- 测试覆盖请求/响应和 UI 预览不包含 token、Authorization header、Cookie、DSN、client secret、私钥、完整私有 URL、raw provider/downstream payload、raw id、真实账号或完整组织树。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-enterprise-identity-application-access-center`: `/applications` 服务凭据治理区域新增交接包生成动作与 copy-safe 预览。
- `admin-service-credential-owner-boundary`: Admin owner-boundary 契约新增服务凭据治理 handoff package 的字段、安全摘要和 fail-closed 语义。

## Impact

- `web-admin/src/backend/ApplicationAccessServiceCredentialGovernanceBackend.ts`
- `web-admin/src/ApplicationAccessCenter.tsx`
- `web-admin/src/ApplicationAccessCenter.test.tsx`
- `openspec/specs/admin-enterprise-identity-application-access-center/spec.md`
- `openspec/specs/admin-service-credential-owner-boundary/spec.md`
- 本 change 的 OpenSpec artifacts 与归档结果
