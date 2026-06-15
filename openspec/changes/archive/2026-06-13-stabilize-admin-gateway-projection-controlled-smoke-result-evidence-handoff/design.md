## Context

现有 Admin gateway projection 路线已有 release decision、preflight handoff、release runbook、evidence readiness、operator remediation、remediation result evidence 和 controlled smoke execution handoff。新的 result evidence handoff 位于 controlled smoke execution 之后，只处理操作者提供的本地脱敏执行结果摘要。

## Decisions

- 新增独立 Node helper `gatewayProjectionControlledSmokeResultEvidenceHandoff.js`，与现有 `gatewayProjectionControlledSmokeExecutionHandoff.js` 并列，避免改变执行前 handoff 语义。
- 输入只接受脱敏材料：execution handoff summary、result status、result aliases、计数摘要、redaction/risk 分类、operator metadata/note。helper 不读取文件、不调用网络、不访问环境真实 URL 或密钥。
- `ready-for-result-evidence-handoff` 只表示本地脱敏结果材料可交接；它不是 controlled smoke pass、full-success、生产就绪、真实 publish 成功、Gateway ingestion 成功或 authorization facts 生效。
- 缺少 execution handoff、缺少 result status/alias/counts、状态不是可交接状态、计数和 alias 不一致、未知 alias、疑似敏感字段、真实环境信号或跨 owner 成功外推时，统一 fail closed，并返回稳定 blocker/remediation alias、operatorActions、ownerHandoffLimits 和 `doNotDispatchUntil`。

## Validation Strategy

- 先写 focused `node:test` 覆盖 ready、missing/failed/partial、敏感字段、计数/alias 不一致、跨 owner overclaim 和 operator remediation。
- 使用 Node 原生 `node --test` 运行新 helper 测试；如需要，补跑相邻 controlled smoke handoff 测试。
- 运行 `openspec validate "<change>" --strict`、相关 specs/changes 校验和 `git diff --check`。

## Rollout

该 change 只新增本地 dry-run helper/Bruno 入口和文档，不需要数据库迁移、服务部署或真实环境配置变更。若后续要接入真实 controlled smoke 结果，由对应 owner 另行提供脱敏摘要并通过本 helper 的输入契约交接。
