# 对齐 Admin 交接包 keep-in-env fallback 语义

## Why

Admin copy-safe 交接包仍把 `keepInEnv` / `admin_service_credential_keep_in_env` 表达得接近默认阻断项或下一步动作，容易让用户回到机器 `.env` / `config.yaml` 运维路径。当前 P0 路线要求 Admin 只生成 copy-safe 元数据交接包，真实凭据由 Insight Profile 通过 manual/secretRef 绑定补齐；env/config 只能作为 fallback 或运维证据，不是默认客户主路径。

## What Changes

- 将 `keepInEnv` 和 `admin_service_credential_keep_in_env` 降级为 Admin 交接包里的 copy-safe fallback/compat evidence。
- 当 resolver 或 Gateway projection 缺少凭据引用时，默认 next action 指向 Insight 侧 manual/secretRef 绑定。
- 收敛 Admin 默认 UI / 诊断文案，避免把机器 `.env` 或 `config.yaml` 作为默认主路径。
- 补充 focused tests，覆盖 copy-safe 包边界、缺凭据引用 next action、无 secure grant 字段和 keep-in-env fallback 优先级。

## Non-Goals

- 不实现 Admin secure handoff 或 `secure_handoff_grant`。
- 不修改 API、Gateway 或 Insight contract。
- 不新增 Admin secret 存储、凭据签发/撤销或 resolver lifecycle。
