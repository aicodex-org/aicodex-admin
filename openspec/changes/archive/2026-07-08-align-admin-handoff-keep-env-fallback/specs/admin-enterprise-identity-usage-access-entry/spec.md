## MODIFIED Requirements

### Requirement: Admin copy-safe 交接包对齐 Insight Profile 草稿

Admin `用量接入` 页面 SHALL 生成仅包含 copy-safe metadata 的 Insight Admin Provider 交接包；当 resolver 或 Gateway projection 缺少凭据引用时，页面和交接包 SHALL 优先把 operator next action 指向 Insight Profile manual/secretRef credential binding。

#### Scenario: keep-in-env 只作为 fallback evidence

- **GIVEN** Admin copy-safe governance metadata 中存在 `keepInEnv` 或 `keep_in_env` group
- **WHEN** operator 生成 Admin handoff package
- **THEN** package MAY 包含 `keepInEnv`，但只能作为脱敏 fallback 或兼容证据
- **AND** `admin_service_credential_keep_in_env` SHALL NOT 成为默认顶层 blocker 或主要 `nextAction`
- **AND** 缺 resolver 或 Gateway projection credential reference 时，package SHALL 引导 operator 在 Insight Profile 中通过 manual/secretRef 绑定凭据
- **AND** package SHALL NOT 包含 secure handoff grant 字段、raw secret value、Authorization、Cookie、client secret、完整私有 URL、raw payload、raw id、真实账号或完整组织树
