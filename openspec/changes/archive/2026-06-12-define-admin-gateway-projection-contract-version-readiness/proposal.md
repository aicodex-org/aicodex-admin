# define-admin-gateway-projection-contract-version-readiness

## Why

admin gateway projection payload 当前包含 `projectionBatchId`、gateway 专用 int64 `orgVersion`、`generatedAt`、`freshness`、`lineage` 和 `subjects[]`，但没有显式 `contractVersion`。随着 API projection status、authorization report export 和 Insight 展示继续推进，后续可能需要在报表或排障面展示 payload contract 版本，或在 API ingestion 侧 gate 不同 payload 版本。

从 Admin owner 角度，需要先把边界说清楚：Admin 不应在 API ingestion contract 尚未要求时私自发明 `contractVersion` 字段；也不能把 `lineage.sourceVersion`、gateway `orgVersion`、subject `projectionVersion` 混用为 contract version。

## What Changes

- 定义 admin 对 gateway projection payload version 的 owner 结论：当前不新增 payload 顶层 `contractVersion` 字段。
- 明确现有版本字段语义：
  - `lineage.sourceVersion` 表示 admin source snapshot version。
  - 顶层和 subject `orgVersion` 表示 gateway ingestion 排序/新鲜度使用的 int64 projection version。
  - subject `projectionVersion` 表示 subject 级内容版本。
- 明确如果 API/gateway 需要显式 payload `contractVersion`，必须先由 API ingestion contract 提出字段、默认值、兼容策略和错误码；Admin 随后以配对 implementation change 跟进。
- 更新 OpenSpec delta 和 verification，形成后续 API handoff 口径。

## Impact

- 本 change 是 proposal / contract-readiness-review，不改生产代码、不改 API/Insight、不执行 60 写入或真实 gate。
- 不改变 admin-to-gateway projection payload 当前 JSON shape。
- 不写 gateway authorization facts，不让 Insight 消费 admin observability 或管理页面 JSON。
