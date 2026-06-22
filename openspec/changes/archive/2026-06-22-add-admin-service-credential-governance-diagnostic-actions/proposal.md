# Change: add-admin-service-credential-governance-diagnostic-actions

## Why

60 运行态和 UI 验收已经证明 Admin 可以查看、保存并回读 `usage_identity_resolver` 等 copy-safe 服务凭据治理元数据，但管理员仍缺少专用的保存前/保存后诊断动作。当前 UI 能展示来源和 owner hint，却不能直接判断草稿是否 ready、disabled、missing reference、keep-in-env 或 external reference unresolved，只能保存后再从运行态行为间接推断。

## What Changes

- 在现有 Application Access 服务凭据治理边界内新增 copy-safe Admin 诊断接口。
- 对 draft 或 saved governance config groups 做元数据预检，不调用 resolver、Gateway publish/refresh、下游 provider、认证回调或 fixture 写入。
- 在 `/applications` 展示 group-level status、stable alias、owner hint、source class、reference state、caller policy presence、keep-in-env boundary、cannot-infer flag 和 next action。
- 增加后端与前端聚焦测试，覆盖 ready、disabled、missing/unresolved reference、keep-in-env/env_config、unsupported/source class 失败和 raw sensitive material 拒绝。

## Out of Scope

- 不修改 API/Gateway/Insight 仓库。
- 不执行真实 resolver outbound、Gateway publish/refresh、credential test、login、OIDC callback、WeCom sync、DB fixture write 或生产/69 环境操作。
- 不新增顶层配置中心，不做导航信息架构扩张。
- 不触碰 Admin-main 单页面 polish 写集。
