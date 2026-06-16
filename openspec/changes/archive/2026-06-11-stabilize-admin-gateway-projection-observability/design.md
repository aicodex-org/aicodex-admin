# Design

## Goals

- 用稳定、脱敏的 admin-only 诊断面暴露 projection producer 的运行状态。
- 让 60 smoke 能判断 producer 是否启用、refresh 周期是否安全、latest publish 是否成功或为何失败。
- 保持 `define-aicodex-organization-data-and-auth-boundaries` 的三方边界：Admin 只生产 projection 输入，API/gateway 消费并拥有授权事实，Insight 只读消费 provider。

## Decisions

### 1. 诊断输出只暴露摘要

新增诊断响应只包含：

- publisher/refresh 是否启用及 disabled reason；
- interval、TTL 和 `intervalLessThanTTL`；
- 最近一次 publish audit 的 batch、version、lineage、freshness、subject counts、skip summary、status/error category 和 duration；
- 最近一次 refresh run 的 run 统计、last success/failure、next run 估算。

响应不得暴露 endpoint、token、Authorization header、Cookie、原始 gateway response、完整组织结构或个人联系方式。

### 2. 使用进程内最近状态，不新增持久化表

本 change 是 runtime-readiness 小收口，不引入新的持久化审计表。进程内状态足以支撑最小 smoke 和当前排障；如果后续需要跨重启保留历史，再单独开 change 设计持久化 audit。

### 3. 失败分类稳定化

内部错误码保持已有 builder/publisher 错误来源，但诊断输出统一映射到稳定 category：

- `projection_token_missing`
- `gateway_unavailable`
- `gateway_contract_mismatch`
- `source_connection_stale`
- `source_connection_disabled`
- `mapping_untrusted`
- `lifecycle_untrusted`
- `lineage_invalid`
- `no_publishable_subjects`
- `unknown`

### 4. Smoke 复用 Bruno

沿用 `api-tests/bruno/aicodex-admin`，新增 projection observability 只读请求。私有环境通过变量提供登录态和目标组织；验证记录只写脱敏结果摘要。

## Risks

- 进程重启会丢失 latest publish/refresh 内存状态。诊断响应必须明确 latest state 可能为空，不能伪装为成功。
- 如果 60 环境没有启用 projection publisher 或缺少 token，smoke 应记录 disabled/config gap，不能伪造 projection readiness 通过。
