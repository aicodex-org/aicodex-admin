# Admin WeCom source remediation handoff

## Why

现有 WeCom source readiness、release decision、controlled smoke preflight 和 evidence handoff 已经能产生脱敏摘要，但 operator 在 controlled smoke 或人工执行前还缺少一个稳定的失败修复交接入口。当前只看单个 summary 容易把 `ready`、`blocked`、`hard-red-line` 或脱敏 evidence 误读成 full-success，也缺少按 owner 分派的下一步修复动作。

## What Changes

- 新增 Admin-owned 本地只读 WeCom source operator remediation handoff wrapper。
- wrapper 只消费脱敏 readiness/release/preflight/evidence handoff summary 和稳定 alias，输出 `ready`、`blocked`、`needs-user-action`、`hard-red-line` 等 operator 可读状态。
- 输出 stable failure alias、owner、下一步修复动作、缺失前置、红线提示、最小解除条件和不能外推边界。
- 同步 Bruno 本地 wrapper 入口、WeCom 同步 README/operator guidance 和主规格 requirement。

## Non-Goals

- 不触发真实 WeCom 同步，不创建 sync run，不写真实 fixture 或 DB。
- 不查询 API、Insight、Gateway 数据，也不证明组织树非空、projection publishable、authorization facts 生效、controlled smoke 已通过或 full-success。
- 不修改 WeCom 同步 API、后端运行时代码、Insight/Gateway/API 仓库或真实环境配置。

## Impact

- 影响范围限制在 Admin 仓库的 Bruno local-only helper、WeCom 同步 operator 文档和 OpenSpec 规格。
- 后续 operator 可先运行 remediation handoff 定位可修复问题，再决定是否重跑只读 readiness/release/preflight/evidence handoff。
