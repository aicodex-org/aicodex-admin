## Why

Admin gateway projection cleanup 已具备 dry-run guardrails、execute readiness、approval audit trail、approval policy readiness 和 decision draft/readiness。operator 仍缺少真实 cleanup gate 开放前的 owner-boundary preflight：需要把策略状态、审批草案、人工审阅证据、owner 边界、cannotInfer、noFallback、保留期和脱敏约束聚合成一个只读、可复制的执行门禁预检包。

本 change 只补 Admin owner 范围内的 execution gate owner-boundary preflight，不打开真实 cleanup gate，不执行 cleanup/delete/update，不写 Gateway facts。

## What Changes

- 新增 Admin-owned cleanup execution gate owner-boundary preflight 只读 API/service。
- Web Admin gateway projection cleanup 区域新增 execution gate preflight 面板，展示 gate readiness、owner boundary、manual review blockers、cannotInfer、noFallback、retention/redaction 摘要和复制/导出入口。
- 补充后端 service、controller/router/authz、前端 backend/page 聚焦测试，覆盖 ready、blocked、cannotInfer、noFallback、错误禁用、复制导出和只读边界。
- 更新 admin gateway organization projection publisher 主规格 delta 和 verification 记录。

## Non-Goals

- 不执行真实 cleanup/delete/update，不修改 publish attempt 记录。
- 不创建真实 cleanup execution gate，不持久化执行批准，不打开生产 cleanup gate。
- 不触发 projection publish、remediation action、租户同步或组织主数据写入。
- 不读取或修改 API/Gateway/Insight 内部库，不写 Gateway authorization facts。
- 不修改 OIDC routing、auth center shell、WeCom login config、Feishu/WeCom sync 或 organization directory remediation notes 写集。

## Impact

- 后端：复用 `GatewayProjectionPublishAttemptHistoryService` 的 decision draft、policy readiness、execute readiness 和 audit trail，派生只读 execution gate preflight。
- 前端：复用 `PlatformApiMappingPage` 的 cleanup readiness 区域，增加 owner-boundary preflight 展示和脱敏复制。
- 权限/路由：新增 admin-only GET 路由和 authz 规则。
- 数据：P0 不新增表，不执行破坏性写入；返回值和导出包必须脱敏。
