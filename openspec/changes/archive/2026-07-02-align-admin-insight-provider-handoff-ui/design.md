## Context

Admin 当前已有 `insight-admin-provider-wrapper` 合同和三条 wrapper 路由：

- `/api/admin-provider/insight/v1/current-user`
- `/api/admin-provider/insight/v1/current-user/scope`
- `/api/admin-provider/insight/v1/current-user/organization-tree`

现有服务凭据治理 UI 已能生成 copy-safe Admin 交接包，并对敏感字段做过滤。本 change 不扩大后端 contract，只把 UI 口径和默认摘要对齐 P0：Admin 是 Insight Admin Provider 的 owner evidence 提供方，不是 Insight Profile 的运行态用量 provider 配置来源。

因为该功能尚未发布，不需要兼容旧用量接入 UI。旧的“待补配置才展开治理项、ready 时隐藏 owner evidence”的面板结构不适合作为标准交接页，应直接替换为面向 Insight Admin Provider 的交接页面结构。

## Decisions

### Decision: 入口改为 Insight Admin Provider 交接/状态

页面标题和面板标题使用 `Insight Admin Provider 交接` / `Insight Admin Provider 状态`，而不是只显示 `用量接入`。`用量接入` 可保留在路径面包屑中，作为所在业务域提示。

### Decision: 推倒旧治理面板，改为标准交接页

页面固定为四块：状态与 P0 边界、wrapper 能力、owner evidence 摘要、copy-safe 交接包操作。owner evidence 摘要在 ready 和 blocked 状态都默认展示，便于 operator 扫描 owner、readiness、credential/source 和 next action。机器 alias、blocked alias、raw policy、raw payload 和高级诊断仍不默认展示。

### Decision: Admin secure handoff 明确不在 P0

生成成功和待操作提示都说明 Insight P0 使用 copy-safe + manual/secretRef binding。Admin secure handoff 不是默认动作，后续必须等 Admin credential issuer/revoke/resolver 生命周期齐备后作为 P1 独立 change。

## Risks

- 文案过重会降低后台扫描效率，因此只增加一条紧凑说明和 wrapper 能力摘要，不恢复复杂详情面板。
- 仅改前端口径不能证明 Insight 运行态 provider 可用，验证报告必须限定为 Admin UI / copy-safe package 层级。
