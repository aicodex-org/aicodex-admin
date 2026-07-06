## Context

本 change 是 `Insight Admin Provider 交接` 页的 UI preview polish。页面业务边界保持不变：Admin 只生成 copy-safe 元数据交接包，真实凭据由 Insight Profile 的 manual/secretRef 绑定流程补齐。

## Decisions

- 默认层只保留用户决策需要的信息：状态、下一步、目标消费方、包类型、缺凭据引用提示和生成元数据交接包主按钮。
- 诊断信息默认收起；展开后先展示阻断项表格，再展示可用能力，技术证据继续降到二级折叠。
- 阻断表格只提供建议动作文本，不提供页内伪跳转，避免用户误解为可以在 Admin 中修复凭据绑定。
- 窄视口下复用现有 drawer 导航，避免桌面侧栏挤压交接页。

## Non-Goals

- 不新增或修改后端接口。
- 不实现 Admin secure handoff。
- 不新增 Admin secret 管理、凭据发行、撤销或绑定生命周期。
- 不改 API、Gateway 或 Insight contract。
