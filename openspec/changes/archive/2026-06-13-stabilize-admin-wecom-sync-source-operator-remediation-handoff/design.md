# Design

## Goals

- 在 Admin owner 边界内提供一个只读 remediation wrapper，把已有 WeCom source evidence summary 聚合成 operator 可执行的失败修复交接。
- 所有输出使用稳定 alias 和 owner-scoped handoff，不回显输入原文或敏感值。
- 对红线信号、脱敏缺口和 full-success 外推 fail closed。

## Decisions

- 新增 `api-tests/bruno/aicodex-admin/scripts/wecomSourceOperatorRemediationHandoff.js`，采用与现有 WeCom source helper 和 gateway operator handoff 一致的 CommonJS + `node:test` 模式。
- 输入只接受 summary 形态字段：`readinessSummary`、`releaseDecision`、`controlledSmokePreflight`、`evidenceHandoff`、`blockingAliases` 和 operator metadata alias。字段名或值出现 token、secret、Cookie、私有 URL、真实账号、手机号、邮箱、完整组织树、完整响应体、真实 DB/fixture/publish/downstream 成功断言时，直接返回红线或脱敏阻断。
- 普通 source readiness blocker 映射为 `blocked`；缺失 readiness/release/preflight/evidence summary 映射为 `needs-user-action`；真实环境写入、非本地只读 scope、full-success/downstream overclaim 映射为 `hard-red-line`；无 blocker 时仅返回 `ready`，但仍明确不能外推。
- Bruno yml 只做本地 `before-request` wrapper 调用，并故意 abort HTTP 请求；不访问真实 endpoint。

## Risks And Mitigations

- **误把脱敏 evidence 当作成功证明**：输出固定包含不能外推边界，ready 也只代表 remediation handoff 可交接。
- **敏感值泄漏**：wrapper 先扫描输入字段名和值，结果不包含原始 input。
- **跨 owner 误派**：每个 alias 映射 owner、nextAction 和 minimumUnblockCondition；未知 alias 保留在 `admin_operator` 边界。

## Verification

- 先添加 focused failing `node --test`，再实现 wrapper。
- 运行 focused helper tests、相关 WeCom source helper tests、changed helper coverage、OpenSpec strict validation 和 `git diff --check`。
