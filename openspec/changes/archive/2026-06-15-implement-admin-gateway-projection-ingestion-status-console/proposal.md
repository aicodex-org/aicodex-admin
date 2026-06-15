## Why

Admin operator 现在可以看到 Admin producer 侧的 projection dry-run、run diff 和 retry readiness，但无法在 Admin 控制台只读查看 API/Gateway owner 对最近一次或指定 projection 的 ingestion receipt/status。失败排障时，operator 仍需要区分 Gateway 是否已 accepted/applied，还是 stale、conflict、lineage_invalid、unmapped_subjects、not_found 或 provider_unavailable。

本 change 目标是在 Admin owner 边界内增加 ingestion-status operator console/API：Admin 只读调用 API/Gateway `GET /api/gateway-organization-projection/v1/ingestion-status` contract，并把 Gateway owner 状态以脱敏 operator envelope 展示给 Admin operator。该能力不触发 publish，不写 Gateway facts，不直连 API/Gateway/Insight 数据库。

## What Changes

- 新增 Admin gateway projection ingestion status client/service/controller，支持 `latest`、`projectionBatchId`、`orgVersion`、`sourceVersion` 查询。
- 复用 gateway projection 服务间 token；支持可选 status endpoint 配置，缺省从现有 publish endpoint 派生 ingestion-status endpoint。
- 返回稳定脱敏 envelope：status、statusAlias、failureCategory/reasonCode、freshness、lineage、subject counts、receivedAt/appliedAt/durationMs、query input summary。
- 在 web-admin 现有 Platform API mapping / Gateway projection operator 区域增加 ingestion status 只读区块，展示 Gateway owner 状态和查询条件。
- 补 OpenSpec delta、后端/前端聚焦测试、覆盖率和验证记录。

## Non-Goals

- 不修改 API/Gateway/Insight/RedClaw 仓库。
- 不直连 API/Gateway/Insight 数据库，不读取 Gateway projection store，不使用 Insight scope、旧缓存或页面字段 fallback。
- 不触发 projection publish，不写 Gateway authorization facts，不写真实 fixture，不打开真实 gate。
- 不改主 Admin publish attempt history 存储/列表写集，不改飞书/企微组织同步写集。
- 不返回 token、Cookie、私有 URL、raw gateway response、完整 projection payload、完整组织树或 subject 明细。

## Impact

- Admin operator 可以在同一控制台判断 Gateway owner ingestion 状态是否 accepted/applied，或是否需要处理 stale/conflict/lineage_invalid/unmapped_subjects/not_found/provider_unavailable。
- 所有状态仍来自 Gateway owner contract；Admin 只做只读包装和脱敏展示，不把 Gateway 状态伪造成 Admin readiness 或下游授权成功。
