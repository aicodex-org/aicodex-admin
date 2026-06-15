# Design

## Goals

- 用本地只读 helper 汇总 Admin WeCom source controlled-smoke evidence handoff。
- 输入只允许脱敏 readiness、release decision 和 preflight summary，不允许真实环境值、完整响应体、完整组织树或下游成功断言。
- 输出必须 fail-closed，给出 operator 下一步、缺失前置、脱敏检查、硬红线 flags 和不能外推边界。

## Inputs

helper 接受一个对象，字段语义如下：

- `readinessSummary`：来自 `Source Readiness Handoff` 的脱敏摘要，至少包含 `status`、`aliases` 或 `reasonAlias`、`evidenceShapeVersion`。
- `releaseSummary`：来自 `Source Release Decision` 的脱敏摘要，至少包含 `decision` 或 `release`、`reasonAlias`、`evidenceShapeVersion`。
- `preflightSummary`：来自 `Controlled Smoke Preflight` 的脱敏摘要，至少包含 `status`、`reasonAlias`、`evidenceShapeVersion`。
- `redactionSignal`：operator 对 handoff 输入的脱敏检查 alias，例如 `redacted`。
- `operatorScope`：operator 执行范围 alias，只允许本地只读 evidence handoff scope。
- `blockingAlias`：上游或 operator 明确阻断 alias。

## Decisions

- 只有 readiness ready、release decision ready、preflight ready、redaction=redacted、无 blocking alias、operator scope 为本地只读 evidence handoff 时返回 `ready-for-controlled-smoke-evidence-handoff`。
- 缺少 readiness、release 或 preflight summary 时分别返回 `missing-readiness-summary`、`missing-release-summary`、`missing-preflight-summary`。
- 输入包含 token、secret、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整响应体或 source tenant 明细时返回 `redaction-required`，输出不得 echo 敏感值。
- 输入包含真实同步、真实 DB、fixture、Gateway/API/Insight、authorization facts、组织树非空、生产就绪或 full-success 迹象时返回 `overclaim-full-success`，优先级高于普通 redaction blocker。
- 明确 red-line/blocking alias 或非本地只读 operator scope 返回 `hard-red-line-blocked`。

## Read-only Boundary

Bruno 入口只加载本地 helper 和 Bruno 变量，不发 HTTP 请求，不调用真实同步接口，不访问真实 DB，不读取 Gateway/API/Insight 数据。helper 不依赖网络、数据库、环境密钥或外部服务。

## Verification

- 先写 focused Node 测试并确认 RED。
- 实现 helper 后运行 focused `node --test`。
- 使用 Node 原生 coverage 覆盖新增 helper，line/branch/function 均不低于 85%。
- 运行 OpenSpec strict validate 和 diff whitespace 检查。
