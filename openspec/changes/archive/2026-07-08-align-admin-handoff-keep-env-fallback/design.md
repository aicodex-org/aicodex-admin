# Design

## Scope

本 change 限定在 Admin copy-safe 交接包生成器，以及直接相关的 UI 文案和测试。交接包继续使用 `schema=aicodex.admin.serviceCredentialGovernanceHandoff` 和 `insightProfile.packageType=copy_safe_handoff`。

## Decisions

1. `keepInEnv` 仍可作为脱敏 boolean 出现在相关 package group 中，因为它是兼容和运维证据。
2. `admin_service_credential_keep_in_env` 不得提升为顶层 `blockedAliases` 或默认 Insight Profile next action。缺 resolver 或 Gateway 凭据引用才是可操作阻断。
3. 缺凭据引用时使用标准化 next action，引导用户把交接包导入 Insight Profile，并通过 manual/secretRef 绑定 resolver 凭据。
4. 交接包不得新增 grant id、nonce、target registration id、expiry 等 secure handoff 字段。
5. `keep_in_env` group 的 label 和动作语义必须降级为 fallback evidence，不输出“到部署配置或外部 secret system 维护”这类默认用户动作。

## Safety

现有 redaction helper 继续作为字符串和 runtime policy 值的脱敏边界。测试断言生成 JSON 不包含 raw secret 或 secure grant 字段。
