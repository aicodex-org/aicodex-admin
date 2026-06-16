## Context

Admin owner 已有三个本地只读 Gateway Projection 交接 helper：

- `gatewayProjectionReleaseDecision`：把 Admin projection preflight/readiness evidence 分类为 `ready-for-controlled-smoke` 或本地 blocker。
- `gatewayProjectionControlledSmokePreflightHandoff`：把 Admin release/readiness 和 API diagnostics evidence 聚合为受控 smoke 准备 handoff。
- `gatewayProjectionControlledSmokeReleaseRunbook`：把 release/preflight evidence 汇总成 operator runbook。

本 change 在这些 helper 之后新增一个 evidence bundle readiness gate，只判断“是否具备进入受控 smoke evidence review 的脱敏证据”，不判断真实 smoke 结果。

## Goals

- 只接受脱敏 alias、status、decision、owner handoff、最小解除条件和 redaction signal。
- 对缺少 Admin release/preflight/runbook evidence、缺少 API diagnostics evidence、脱敏失败、红线信号和 full-success 外推统一 fail closed。
- 输出稳定分类：`ready-for-controlled-smoke-evidence-review`、`missing-admin-preflight`、`missing-api-diagnostics`、`redaction-required`、`red-line-blocked`、`overclaim-full-success`。
- 输出 owner handoff、最小解除条件、operator next actions、`doNotDispatchUntil` 和不能外推边界，便于协调层安全回传。

## Non-Goals

- 不连接真实 Admin/API/Insight/Gateway 环境。
- 不触发 publish、refresh、gateway ingestion、authorization facts、fixture/DB 写入或 read model rebuild。
- 不读取完整响应体、真实组织树、真实账号、私有 URL、token、Cookie 或敏感日志。
- 不改变 API diagnostics、Gateway ingestion 或 Insight consumer 的 owner 边界。

## Decisions

- Decision: 使用 CommonJS 纯函数 helper，并沿用相邻 `gatewayProjectionControlledSmoke*` 脚本的 fail-closed pattern。
  Rationale: 该目录现有 Bruno runtime 和 Node tests 均使用 `require`，纯函数便于本地 dry-run 和覆盖率统计。
- Decision: Bruno 入口优先消费私有变量中的脱敏 evidence bundle，不默认调用真实 observability 接口。
  Rationale: 本任务目标是受控 smoke 前的 evidence bundle readiness，不是运行态观测 smoke；默认本地校验可以避免误连真实环境。
- Decision: ready 只表示 `release=release_after_report` 可交给 evidence review，不表示 controlled smoke 成功。
  Rationale: prompt 要求禁止外推 API/Gateway/Insight 成功、生产就绪或 full-success。

## Risks / Trade-offs

- Risk: operator 把 ready 误读成真实 smoke 通过。
  Mitigation: helper、README、Bruno 输出和规格均保留不能外推边界与 `doNotDispatchUntil`。
- Risk: evidence 输入夹带完整响应或敏感值。
  Mitigation: 递归检查敏感字段名和值，命中后只输出稳定 alias，不回显原始值。
- Risk: API diagnostics owner 证据缺失时被 Admin 单侧补算。
  Mitigation: helper 对缺失 API diagnostics 返回 `missing-api-diagnostics`，owner handoff 指向 `api_diagnostics_owner`。
