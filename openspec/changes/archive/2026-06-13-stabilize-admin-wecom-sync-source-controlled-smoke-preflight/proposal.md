# Admin WeCom source controlled smoke preflight

## Why

已有 `Source Readiness Handoff` 和 `Source Release Decision` 可以判断 Admin WeCom source 是否具备进入后续 owner 判断的脱敏证据，但在进入受控 smoke 前仍缺少一个 implementation-first 前置门禁，把 readiness、release decision、source freshness、脱敏信号、阻断 alias 和 operator scope 合并成单一 fail-closed 结论。

如果缺少该 preflight，operator 容易把 source ready 或 release decision 外推成真实 WeCom 同步成功、组织树非空、Gateway/API/Insight 成功、authorization facts 生效或 full-success。

## What Changes

- 新增本地只读 `wecomSourceControlledSmokePreflight` helper，输入只接受脱敏 summary/evidence alias。
- 新增 Bruno 只读入口，允许 operator 在本地校验受控 smoke 前置条件，不连接真实环境、不触发同步。
- 更新 operator README 和 `wecom-organization-sync` 规格，明确 preflight 只证明 Admin WeCom source 受控 smoke 准备，不证明下游成功或生产就绪。

## Non-Goals

- 不触发真实 WeCom 同步、真实 DB 查询/写入、真实 fixture、publish/gateway ingestion 或 authorization facts。
- 不修改 API、Insight、Gateway 仓库或跨 owner contract 字段。
- 不收集 token、Cookie、私有 URL、真实账号、完整组织树、完整响应体或敏感日志。
- 不把本地 preflight 扩展为跨 owner 发布审批系统或生产就绪声明。

## Impact

- Admin owner 范围：Bruno collection、本地 Node helper、focused 测试、OpenSpec 主规格和 operator README。
- Operator 将获得稳定状态：`ready-for-wecom-controlled-smoke-preflight`、`missing-readiness-handoff`、`missing-release-decision`、`source-not-fresh`、`redaction-required`、`red-line-blocked`、`overclaim-full-success`。
