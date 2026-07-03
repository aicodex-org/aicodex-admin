## ADDED Requirements

### Requirement: Admin copy-safe 交接包对齐 Insight Profile 草稿
Admin `用量接入 / Admin Provider` 页面生成的 copy-safe handoff package SHALL 暴露适合 Insight Profile 草稿导入的摘要，同时保留既有 owner evidence `groups[]` 摘要和 copy-safe 安全边界。

#### Scenario: 交接包包含 Profile 可解析摘要
- **WHEN** 管理员生成 Admin copy-safe 交接包
- **THEN** package SHALL 包含稳定顶层 metadata 字段 `schema`、`version`、`source`、`generatedAt`、`targetConsumerAlias` 和 `adminOwnerAlias`
- **AND** package SHALL 包含 Insight Profile 摘要，用于标识 package type `copy_safe_handoff`、target consumer alias、Admin owner alias、Admin provider component alias、wrapper capability readiness、credential reference guidance 和 owner evidence summary
- **AND** package SHALL 保留既有 `groups[]` copy-safe owner evidence，便于兼容排障

#### Scenario: 三条固定 wrapper 能力可被消费方识别
- **WHEN** package 描述 Insight Admin Provider wrapper capabilities
- **THEN** package SHALL 包含 `current-user`、`current-user/scope` 和 `current-user/organization-tree` 的 stable aliases
- **AND** 每条 wrapper capability SHALL 只暴露 copy-safe route alias/path、readiness、owner alias 和 next action
- **AND** wrapper capability SHALL NOT 暴露完整 Admin base URL、private URL、token、cookie、Authorization header 或 raw response payload

#### Scenario: partial/missing 状态传递可操作 nextAction
- **WHEN** resolver credential reference、Gateway organization projection 或其他 Admin owner evidence 处于 missing、blocked、keep-in-env 或 cannot-infer 状态
- **THEN** package SHALL 在适用时暴露 `credentialReferenceStatus`、`credentialReferenceKeySummary`、`resolverCredentialReference`、`boundedRuntimePolicy`、`stableAliases`、`blockedAliases`、`nextAction`、`cannotInferRuntimeTruth` 和 `keepInEnv` 字段
- **AND** 缺失的 resolver 或 projection credential evidence SHALL 包含 stable reason alias，以及适合 Insight manual/secretRef binding guidance 的人话 next action
- **AND** package SHALL NOT 要求操作员在 Admin 内配置 API/Gateway usage provider credentials

#### Scenario: 交接包保持脱敏
- **WHEN** Admin status/config/diagnostic inputs contain unsafe material
- **THEN** generated package SHALL 省略 token、secret、Authorization、Cookie、DSN、client secret、private key、完整 private URL、raw payload、raw id、真实账号和完整组织树
- **AND** Base URL material SHALL 只以 alias、route alias/path 或其他 copy-safe locator 表达
- **AND** Admin secure handoff SHALL NOT 在 P0 中被表达为可用或已完成

#### Scenario: 页面生成使用已保存 copy-safe 配置
- **WHEN** 页面状态和治理配置均已加载且不存在待补 Admin 部署配置
- **THEN** 点击 `生成 Admin 交接包` SHALL 使用 normalized status 和 sanitized copy-safe config 生成 package
- **AND** copied JSON SHALL 表达 copy-safe metadata 与 manual/secretRef binding guidance，而不是自动绑定凭据或 secure handoff grant
