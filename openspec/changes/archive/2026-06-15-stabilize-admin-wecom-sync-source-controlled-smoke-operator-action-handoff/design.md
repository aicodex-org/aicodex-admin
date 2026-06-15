# Design

## Goals

- 在 Admin WeCom source owner 边界内，把 operator decision package 转换为可复制的本地 action package。
- 输入只允许脱敏 operator decision handoff summary、脱敏 operator metadata 和本地备注，不允许真实环境值、完整响应体、完整组织树或下游成功断言。
- 输出必须 fail closed，给出下一步 action、owner、最小解除条件、红线 flags、缺失前置和不能外推边界。

## Inputs

- `operatorDecisionHandoffSummary`：来自 `Controlled Smoke Operator Decision Handoff.yml` 的脱敏摘要，至少包含 `status`、`release`、`blockerAlias`、`remediationAlias` 和 owner handoff 信息。
- `operatorMetadata`：可选脱敏值班 metadata；不得包含 token、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整响应体、`configRef` 或 `secretRef`。
- `operatorNote` / `claim`：可选备注；不得写真实 WeCom sync、真实 controlled smoke、真实 fixture/DB、Gateway/API/Insight 成功、authorization facts、production readiness、controlled smoke pass 或 full-success 外推。

## Decisions

- 只有 decision summary `status=ready-for-operator-decision-handoff` 且 `release=release_after_report`、无未知 alias、无敏感值、无 red-line signal 时返回 `actionStatus=ready-for-operator-action`。
- 缺少 decision summary 或 decision summary 非 ready 时返回 `blocked`，保留上游 blocker/remediation alias、owner handoff 和最小解除条件。
- 上游 `needs-user-action` 原样收敛为 `actionStatus=needs-user-action`，不得降级为 ready。
- 上游 `hard-red-line` 或输入出现真实执行/下游成功/生产就绪/full-success 信号时返回 `hard-red-line`。
- 输入包含敏感字段名或 credential-like 值时返回 `blocked` + `blockerAlias=sanitization_failed`，输出不得 echo 原始字段名或字段值。
- 未知 alias 一律返回 `blocked`，要求替换为稳定 Admin WeCom source handoff alias。

## Read-only Boundary

Bruno 入口只加载本地 helper 和 Bruno 变量，不发 HTTP 请求，不调用真实同步接口，不访问真实 DB，不读取 Gateway/API/Insight 数据。

## Verification

- 先写 focused Node 测试并确认 RED。
- 实现 helper 后运行 focused `node --test`。
- 使用 Node 原生 coverage 覆盖新增 helper，line/branch/function 均不低于 85%。
- 运行相关 WeCom source controlled-smoke helper subset、OpenSpec strict validate 和 diff whitespace 检查。
