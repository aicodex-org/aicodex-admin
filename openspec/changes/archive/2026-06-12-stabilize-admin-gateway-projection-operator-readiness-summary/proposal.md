## Why

Admin projection operator 目前需要分别查看 gateway projection observability、source freshness preflight、Platform API mapping readiness 和 runbook，才能判断当前环境是部署包旧、source freshness 不满足、mapping 缺口，还是 publishable subject fixture 未就绪。缺少一个只读、脱敏、可 dry-run 的 readiness summary 入口，容易把 `mapping_missing`、旧部署 shape 或缺 subject fixture 误外推为完整 projection 业务成功。

## What Changes

- 新增 Admin-owned gateway projection readiness summary 入口脚本，组合 observability preflight 和可选 mapping readiness 响应，输出稳定 `status`、alias、counts 和 owner handoff。
- 新增 Bruno 只读 smoke/runbook 入口，operator 可在不写真实 fixture、不查询 API/Insight/真实 DB、不触发 publish/refresh 的前提下运行 summary。
- 补充缺配置、缺 token、旧部署包、source freshness、mapping_missing、publishable subject 前置不足和敏感字段泄漏的稳定 alias 与处置指引。
- 更新 OpenSpec 主规格和 README，明确 summary 只能作为 Admin producer/operator readiness 诊断，不能外推为 gateway authorization facts 或 API/Insight 授权成功。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-gateway-organization-projection-publisher`: 增加 operator readiness summary 对 source freshness、mapping readiness、publishable subject 前置、部署包前置和 owner handoff 的只读汇总契约。

## Impact

- 影响 Admin 仓库内 Bruno 脚本、只读 smoke/runbook、OpenSpec 文档和聚焦 Node 测试。
- 不改变生产 API 契约、数据库 schema、projection publish/refresh 行为、真实 fixture 或 API/Insight/gateway owner 边界。
