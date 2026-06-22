# Design

## Backend Boundary

在现有 status/config endpoint 旁新增 `POST /api/application-access/service-credential-governance-diagnostics`。controller 复用 global-admin 检查，并把诊断逻辑委托给 service/object 层 builder。

请求接受与配置保存路径一致的 copy-safe governance config shape。诊断 builder 独立评估每个提交的 group，并返回脱敏 alias，而不是 raw value。它不得调用下游 provider、resolver target、Gateway endpoint、credential store、auth callback 或持久化写路径。

## Diagnostic Semantics

Each group returns:

- `status`: compact user-facing state such as `ready`, `blocked`, `disabled`, `missing_reference`, `keep_in_env`, or `cannot_infer`.
- `stableAlias`: stable machine-readable alias for automation and reports.
- `owner`, `sourceClass`, `credentialReferenceStatus`, `callerPolicyPresent`, `keepInEnv`, `nextAction`, `cannotInfer`.
- `blockedReasons`: copy-safe stable aliases, never raw payloads.

Fail-closed 场景包括 unsupported group、unsupported source class、raw sensitive material、disabled group、missing caller policy、missing bounded runtime policy、missing reference、unresolved external/admin reference，以及 Admin 无法推断运行态 secret readiness 的 keep-in-env/env_config。

## Frontend

`/applications` 保留现有“服务凭据治理 / 治理配置”入口，并在保存按钮旁新增小型“诊断/预检”动作。该动作把当前 sanitized draft 发送到诊断接口，并在配置编辑区下方展示结果。

UI 必须让管理员理解该动作只作用于服务凭据治理配置。结果展示 stable alias、owner hint、source class、reference state、caller policy presence、keep-in-env boundary、cannot-infer state 和 next action。UI 不得渲染 raw token、完整 URL、raw id、payload 或 private endpoint。

## Validation

使用聚焦 Go tests 覆盖 service diagnostic builder 和 controller route，使用聚焦 Jest tests 覆盖 UI action 与 redaction；归档前运行要求的 OpenSpec、后端、前端、build 和 diff checks。
