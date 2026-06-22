## Context

`/applications` 已在服务凭据治理区域读取 status、读取/保存 copy-safe config，并提供诊断预检。现有实现已经有前端服务层类型、请求 helper、UI 脱敏 sanitizer 和 Jest 覆盖。

Insight `业务服务接入` / API-Gateway owner 链路需要消费的是 Admin owner 侧的安全摘要，而不是原始 `.env`、私有 YAML、真实 resolver/Gateway 运行结果或可复用凭据。交接包应由 Admin UI 从已回读配置、运行态 status 和可选 diagnostic 摘要组合生成，作为 copy-safe handoff evidence。

## Goals / Non-Goals

**Goals:**

- 在服务凭据治理既有区域新增“生成/查看交接包”动作和紧凑预览。
- 定义前端 service 层 `serviceCredentialGovernanceHandoffPackage` 生成契约，字段稳定、可测试、可复制。
- 复用保存后的 sanitized config/readback、status 和 diagnostic copy-safe 字段，不触发真实 resolver、Gateway、Insight、API 或外部 secret system 调用。
- 对 `env_config`、`keepInEnv`、missing reference、disabled/blocked group、external unresolved reference、unsupported source class 和 cannot-infer runtime truth fail closed。
- 通过测试证明 package 请求/响应、UI 预览和 sanitizer 不输出敏感材料。

**Non-Goals:**

- 不新增独立菜单、泛配置中心、旧 UI polish 或组织页 toolbar/workspace tabs 改动。
- 不修改 Admin 真实认证、OIDC、WeCom、API/Gateway/Insight 项目或运行态 resolver/Gateway 调用链路。
- 不把交接包解释为 Gateway 授权事实、Insight consumer truth 或运行态连接成功证明。

## Decisions

1. **使用本地生成 helper 而非新增真实后端 endpoint。**
   - 现有 `web-admin/src/backend/ApplicationAccessServiceCredentialGovernanceBackend.ts` 已作为本任务的 mock/service 层边界，且派发目标是 Admin owner 侧 UI 交接摘要。
   - helper 接受 sanitized config、status 和可选 diagnostic，返回稳定 package；这能用 Jest 覆盖 fail-closed 和脱敏，不需要引入真实 backend route 或跨项目依赖。

2. **保存后以 readback config 为 package 主输入。**
   - `POST /service-credential-governance-config` 成功后 UI 已用响应覆盖 draft。
   - handoff package 使用当前 readback/draft 中已 sanitizer 的字段；保存后再生成时会体现服务端回读结果，而不是旧表单值。

3. **group readiness 由 copy-safe 字段 conservative 推导。**
   - `status=blocked/missing/partial`、`enabled=false`、`credentialReferenceStatus=missing`、缺少 caller policy、`sourceClass=env_config`、`keepInEnv=true`、外部/admin 引用未解析、unsupported source class 或 diagnostic `cannotInfer=true` 都不能输出 ready/full success。
   - package 使用 `readiness`、`stableAliases`、`blockedAliases` 和 `cannotInferRuntimeTruth` 表达边界，方便下游 owner 消费但不替代下游 truth。

4. **UI 只做紧凑预览。**
   - 入口放在既有治理配置按钮组旁，预览复用当前紧凑 row/list 风格。
   - 展示 schema、target consumer alias、Admin owner alias、group readiness、reference/caller/source/keep-in-env/cannot-infer 摘要，不提供 raw JSON 大编辑器、secret 输入或复制 token 行为。

## Risks / Trade-offs

- **交接包不是运行态事实** → 在 package 字段和 UI 文案中保留 `cannotInferRuntimeTruth`、owner hint 和 next action，避免把 copy-safe 摘要误用为连接成功证明。
- **前端 sanitizer 漏掉敏感字段** → 复用并扩展现有 sanitizer，新增 package 级测试断言 token、Authorization、Cookie、DSN、client secret、私钥、完整私有 URL、raw payload、raw id 等不进入请求/响应/预览。
- **与历史 active change 写集冲突** → 只触碰派发允许的服务凭据治理文件和本 change artifacts，不接管历史 active change。
