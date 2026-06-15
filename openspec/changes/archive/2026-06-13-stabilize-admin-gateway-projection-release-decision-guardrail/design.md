# Design

## Goals

- 将既有 `gatewayProjectionObservabilityPreflight` 和 `gatewayProjectionReadinessSummary` 输出归一为 release decision。
- 输出只包含脱敏状态、alias、handoff、最小解除条件和不能外推边界。
- fail closed：输入包含 token、Cookie、Authorization、secret/config ref、source tenant metadata 或完整响应体迹象时，不输出原始内容并归类为 `blocked-by-contract-or-config`。

## Decisions

- release decision 使用稳定值：
  - `ready-for-controlled-smoke`
  - `blocked-by-source-freshness`
  - `blocked-by-mapping-readiness`
  - `blocked-by-contract-or-config`
  - `not-checked`
- decision wrapper 仅消费本地脱敏 summary 或已传入的 observability/mapping readiness 响应，不主动调用接口、不写 fixture、不查询 API/Insight/gateway store。
- `ready-for-controlled-smoke` 只表示本地 evidence 满足受控 smoke 的前置检查，不能外推为真实 publish 成功、gateway ingestion 成功、authorization facts 生效或完整业务成功。
- source freshness alias 优先归为 `blocked-by-source-freshness`；mapping readiness alias 归为 `blocked-by-mapping-readiness`；部署旧 shape、contract/config、subject fixture gate、敏感输入、不可用或未知 alias 归为 `blocked-by-contract-or-config`。
- mapping readiness 未提供时显式输出 `not-checked`，并给出只读下一步。

## Risks

- 该 wrapper 不能替代真实测试环境 publish/smoke，只能减少协调层误读本地证据的风险。
- 如果后续 API/Gateway owner 定义新的 release gate，Admin 需要配对 change 扩展 alias 映射，而不是在本次单侧引入真实发布审批。
