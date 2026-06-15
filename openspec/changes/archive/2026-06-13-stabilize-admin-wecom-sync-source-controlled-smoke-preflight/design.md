# Design

## Goals

- 用本地只读 helper 固化 Admin WeCom source 进入受控 smoke 前的最小证据校验。
- 所有输入必须是脱敏 alias/summary，禁止真实环境值、完整响应体、完整组织树和下游成功断言。
- 输出必须 fail-closed，并给出 owner/fallback 指引和不能外推边界。

## Inputs

helper 接受一个对象，字段语义如下：

- `sourceReadinessAlias`：来自 `Source Readiness Handoff` 的稳定 alias，例如 `wecom_source_ready`。
- `releaseDecisionAlias`：来自 `Source Release Decision` 的稳定 alias，例如 `wecom_source_ready`。
- `sourceConnectionFreshnessAlias`：source connection freshness/state 的脱敏 alias，例如 `fresh` 或 `stale`。
- `redactionSignal`：脱敏检查结果 alias，例如 `redacted`、`redaction_required`。
- `blockingAlias`：上游或 operator 明确阻断 alias。
- `operatorScope`：operator 执行范围 alias，只允许本地只读 preflight scope。

## Decisions

- `ready-for-wecom-controlled-smoke-preflight` 只在 readiness=ready、release decision=ready、source freshness=fresh、redaction=redacted、无 blocking alias、operator scope 为本地只读时返回。
- 缺少 readiness 或 release decision 时分别返回 `missing-readiness-handoff`、`missing-release-decision`。
- freshness 非 fresh 返回 `source-not-fresh`。
- 脱敏缺口、敏感字段名/值、真实 URL、账号、手机号、邮箱、token、Cookie、完整组织树、完整响应体返回 `redaction-required`。
- 真实同步、真实 DB、Gateway/API/Insight、authorization facts、fixture、publish 或 full-success 迹象返回 `overclaim-full-success`，优先级高于普通 redaction blocker。
- 明确 red-line/blocking alias 或非本地只读 operator scope 返回 `red-line-blocked`。

## Read-only Boundary

Bruno 入口只加载本地 helper 和 Bruno 变量，不发 HTTP 请求，不调用真实同步接口，不访问真实 DB，不读取 Gateway/API/Insight 数据。helper 不依赖网络、数据库、环境密钥或外部服务。

## Verification

- 先写 focused Node 测试并确认 RED。
- 实现 helper 后运行 focused `node --test`。
- 使用 Node 原生 coverage 覆盖新增 helper，line/branch/function 均不低于 85%。
- 运行 OpenSpec strict validate 和 diff whitespace 检查。
