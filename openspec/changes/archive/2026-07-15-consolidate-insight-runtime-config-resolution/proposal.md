## Why

Admin 当前已对 usage identity resolver、Insight provider trust 和 Gateway projection 建立局部 saved policy gate，但实际配置读取、优先级、缺失判定和脱敏状态仍分散在 controller、publisher 与状态 overlay 中。技术债基线要求在不建设全仓配置中心或 secret 管理系统的前提下，形成可复用、可测试且默认 fail-closed 的 typed runtime config resolution 边界。

## What Changes

- 为三组 P0 runtime config 建立单一 typed resolver，统一输出 adopted source、owner、copy-safe credential reference、saved policy、诊断和稳定 blocker/error code。
- 明确 `manual`、`secretRef`、`legacy`、`keep-in-env` 的采用顺序；saved policy 不可用、分组禁用、配置缺失/非法、外部引用未解析时均 fail closed。
- 让 usage identity resolver、Insight provider trust、Gateway projection publisher/readiness 以及 Insight Admin Provider handoff status/diagnostics 复用同一解析结果，避免运行路径与状态路径漂移。
- 保持 credential material 只由 env/config 或可注入 secret provider 提供；`ServiceCredentialGovernanceConfig` 继续只保存 copy-safe metadata。
- API、Provider Doctor、状态和日志只输出 copy-safe reference、采用来源、诊断和 blocker，不输出 endpoint、token、secret、raw payload 或完整私有 URL。
- 保留未保存治理配置时的 legacy 兼容，不扩展到全仓 `conf.GetConfig*`、Admin secret 管理、跨仓契约或前端构建工具。

## Capabilities

### New Capabilities

- `admin-runtime-config-resolution`: 定义 P0 runtime config 的 typed resolution、来源优先级、credential material provider 边界、稳定 fail-closed blocker，以及 API/诊断脱敏契约。

### Modified Capabilities

- 无。现有 `admin-service-credential-owner-boundary`、`insight-admin-provider-wrapper` 和 `admin-gateway-organization-projection-publisher` 的 owner、provider 与 projection 行为保持兼容，本 change 用新 capability 统一它们的配置解析实现和诊断语义。

## Impact

- 影响 Admin Go 的 service credential runtime policy/resolver、usage identity resolver、Insight provider trust、Gateway projection publisher/readiness、handoff status/diagnostics 及直接相关测试。
- handoff/status 响应保持现有字段兼容，可增加 copy-safe adopted source、reference alias、diagnostic/blocker 摘要；不会新增或回显 credential material。
- 影响等级按用量链路处理：`insight_provider_trust` 为高，`usage_identity_resolver` 为中高，`gateway_organization_projection` 为中；必须通过迁移前后等价测试证明外部鉴权、映射与 projection 稳定语义不变。
- 不新增生产依赖、数据库 schema、fixture migration、前端页面或跨 repo contract；不触碰 `test` 分支和真实认证链路。
- 不修改接入包 schema、secure handoff、Insight/Admin Provider DTO 或既有 stable reason alias；不触碰 Vite/前端构建工具与 locale 写集。
