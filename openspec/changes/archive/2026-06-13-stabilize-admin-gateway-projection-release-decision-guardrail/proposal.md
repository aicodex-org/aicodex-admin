# Admin gateway projection release decision guardrail

## Why

现有 gateway projection source freshness preflight、readiness summary 已能输出脱敏 runtime readiness 证据，但 operator 仍需要一个更稳定的 release decision 层，把本地 evidence 明确归类为可受控冒烟、被 source freshness 阻断、被 mapping readiness 阻断、被 contract/config 阻断或尚未检查。

如果缺少该 guardrail，协调层容易把本地 preflight/readiness summary 外推为真实 publish/full-success，或把 fixture readiness、部署 shape、source freshness 和 mapping readiness 混成同一种状态。

## What Changes

- 新增本地只读 release decision wrapper，消费既有 observability preflight/readiness summary 的脱敏结果并输出稳定 `decision`。
- 新增 Bruno operator 入口和 README 说明，让 operator 可生成脱敏 release decision summary。
- 更新 Admin gateway projection publisher 规格，声明 release decision 只代表本地 evidence 分类，不等同于真实 publish 或完整业务成功。

## Non-Goals

- 不改 Admin API、Gateway/API/Insight 仓库或 gateway authorization facts。
- 不写真实 fixture、真实 DB、生产或类生产环境、密钥、完整组织树、完整响应体或私有 URL。
- 不触碰 `40-组织树运营/**`。
- 不把本地 decision 扩展成跨 owner 发布审批系统。

## Impact

- Admin owner 范围：Bruno collection、本地 JS wrapper、OpenSpec 主规格。
- Operator 可使用稳定状态做协调层交接，并保留不能外推边界。
