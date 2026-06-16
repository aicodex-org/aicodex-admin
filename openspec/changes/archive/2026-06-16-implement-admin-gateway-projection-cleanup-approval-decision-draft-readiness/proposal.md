## Why

Admin gateway projection cleanup 已具备 dry-run guardrails、execute readiness、approval audit trail 和 approval policy readiness。operator 现在仍缺少真实 cleanup 执行开放前可审阅的“approval decision draft/readiness”包：需要把适用策略、阻断原因、manual review checklist、cannotInfer、retention/audit/redaction 摘要和下一步建议汇总成一个 copy-safe 的只读草案。

本 change 只补 Admin owner 范围内的 decision draft/readiness，不打开真实 cleanup gate，不执行 cleanup/delete/update，不写 Gateway facts。

## What Changes

- 新增 Admin-owned cleanup approval decision draft/readiness 只读 API/service。
- Web Admin gateway projection publish attempt 区域新增 decision draft 面板，展示草案状态、策略摘要、manual review checklist、cannotInfer、脱敏摘要和复制/导出入口。
- 补充聚焦后端、controller/router、前端 backend/page 测试，覆盖 ready、manual review required、blocked、cannotInfer、脱敏和只读边界。
- 更新 admin gateway organization projection publisher 主规格 delta 和 verification 记录。

## Non-Goals

- 不执行真实 cleanup/delete/update，不修改 publish attempt 记录。
- 不创建真实 approval decision，不持久化 decision draft，不打开生产 cleanup gate。
- 不触发 projection publish、租户同步或任何 60/生产写入。
- 不读取或修改 API/Gateway/Insight 内部库，不写 Gateway authorization facts。
- 不修改 OIDC routing、auth center shell、WeCom login config、Feishu/WeCom sync 或 organization directory remediation notes 写集。

## Impact

- 后端：复用 `GatewayProjectionPublishAttemptHistoryService` 的 cleanup execute readiness、approval audit trail 和 approval policy readiness，派生只读 decision draft。
- 前端：复用 `PlatformApiMappingPage` 的 publish attempt cleanup readiness 区域，增加 decision draft 展示。
- 权限/路由：新增 admin-only GET 路由和 authz 规则。
- 数据：P0 不新增表，不执行破坏性写入；返回值必须脱敏。
