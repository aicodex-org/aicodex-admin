## Context

现有路线已经归档 controlled smoke preflight、release runbook、evidence readiness、execution handoff 和 result evidence handoff。新的 release summary handoff 位于 result evidence handoff 之后，只处理操作者提供的本地脱敏 summary，不运行真实 smoke，也不读取真实环境。

## Decisions

- 新增独立 Node helper `gatewayProjectionControlledSmokeReleaseSummaryHandoff.js`，与 result evidence handoff 并列，避免改变既有执行结果材料交接语义。
- 输入只接受脱敏材料：result evidence handoff summary、release summary status、release summary aliases、计数摘要、redaction/risk 分类和 operator metadata/note。helper 不读取文件、不调用网络、不访问真实 URL 或密钥。
- 输出状态保持四类：
  - `ready-for-release-summary-handoff`：本地脱敏 release summary 可交接。
  - `blocked`：缺 evidence、非 ready、未知 alias、计数/alias 不一致或脱敏失败。
  - `needs-user-action`：需要 operator 补齐 approval/action alias 或等价脱敏用户动作。
  - `hard-red-line`：发现真实 publish、Gateway ingestion、authorization facts、fixture/DB、production-like endpoint、真实 gate、controlled smoke pass 或 full-success 外推。
- blocked、needs-user-action 和 hard-red-line 都保留稳定 `blockerAlias`、`remediationAlias`、owner handoff、最小解除条件和 `doNotDispatchUntil`。
- `ready-for-release-summary-handoff` 只表示本地脱敏 release summary 可交接；它不是 controlled smoke pass、full-success、生产就绪、真实 publish 成功、Gateway ingestion 成功或 authorization facts 生效。

## Validation Strategy

- 先写 focused `node:test` 覆盖 ready、missing/non-ready result evidence、needs-user-action、真实执行信号、敏感字段、cross-owner overclaim、unknown alias 和 counts/alias mismatch，并确认 RED。
- 实现 helper 后运行同一 focused test、相邻 controlled-smoke result evidence handoff subset test 和覆盖率检查。
- 运行 `openspec validate "<change>" --strict`、`openspec validate --specs --strict`、`openspec validate --changes --strict` 和 `git diff --check`。

## Rollout

该 change 只新增本地 dry-run helper/Bruno 入口和文档，不需要数据库迁移、服务部署或真实环境配置变更。若后续要把 release summary 投递到协调或发布流程，只能消费本 helper 输出的脱敏字段，并继续保留不能外推边界。
