# Design

## Goals

- 在 Admin owner 边界内生成真实 controlled smoke 后的 result evidence 交接摘要。
- 输入只允许脱敏 execution handoff summary、result evidence alias/counts、部署/授权摘要和 operator 风险分类，不允许真实环境值、完整响应体、完整组织树或下游成功断言。
- 输出必须 fail-closed，明确区分 `passed`、`partial-handoff`、`blocked` 和 `needs-user-action` 类 alias，并给出下一步 owner 行动。

## Inputs

helper 接受一个对象，字段语义如下：

- `executionHandoffSummary`：来自 `Controlled Smoke Execution Handoff` 的脱敏摘要，至少包含 `status`、`release`、`reasonAlias`、`evidenceShapeVersion`。
- `resultStatus`：本地脱敏 result 状态，允许 `passed`、`passed-with-observations`、`partial-handoff`、`blocked`、`needs-user-action`。
- `resultAliases`：稳定 result alias 列表，只允许 spec/test 定义的 Admin owner alias。
- `resultCounts`：脱敏计数摘要，例如 expected、observed、passed、failed、partial、blocked、missing、unauthorized。
- `deploymentSummary`：必需的脱敏部署摘要，至少以 alias 表示 deployed、not-deployed 或 unknown。
- `authorizationSummary`：必需的脱敏授权摘要，至少以 alias 表示 authorized、unauthorized 或 unknown。
- `redactionSignal`：operator 对 result evidence 输入的脱敏检查 alias，例如 `redacted`。
- `operatorScope`：operator 执行范围 alias，只允许本地只读 result evidence handoff scope。
- `resultModeAlias`：必须是 handoff-only/local-only 模式，避免误触发真实 smoke 或回写。

## Decisions

- 只有 execution handoff ready、result status 为 `passed` 或 `passed-with-observations`、计数与 alias 一致、部署和授权 alias 均为 ready、redaction=redacted、operator scope 为本地只读、result mode 为 handoff-only 时返回 `passed`，但仍只代表本地脱敏 result evidence 可交接。
- result status 为 `partial-handoff` 或计数显示 partial 但不存在 failed/blocked/unauthorized 时返回 `partial-handoff`，指导 operator 补齐缺口或带限制交接。
- 缺少 execution handoff、result status、result aliases、result counts、部署摘要、授权摘要、redaction 或风险分类时返回 `needs-user-action`。
- 未部署、未授权、failed/blocked/missing/unauthorized 计数、未知 alias 或计数不一致时返回 `blocked`，并给出 stable blocker alias 和 owner handoff limit。
- 输入包含 token、secret、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整响应体、真实 DB/fixture/audit/projection 数据或 source tenant 明细时返回 `blocked`，输出不得 echo 敏感值。
- 输入包含真实执行、真实同步、真实 DB、fixture、Gateway/API/Insight、authorization facts、组织树非空、生产就绪或 full-success 迹象时返回 `blocked` 并带 red-line flag。

## Read-only Boundary

Bruno 入口只加载本地 helper 和 Bruno 变量，不发 HTTP 请求，不调用真实同步接口，不访问真实 DB，不读取 Gateway/API/Insight 数据。helper 不依赖网络、数据库、环境密钥或外部服务。

## Verification

- 先写 focused Node 测试并确认 RED。
- 实现 helper 后运行 focused `node --test`。
- 使用 Node 原生 coverage 覆盖新增 helper，line/branch/function 均不低于 85%。
- 运行相关 WeCom source helper tests、OpenSpec strict validate、主规格 validate 和 diff whitespace 检查。
