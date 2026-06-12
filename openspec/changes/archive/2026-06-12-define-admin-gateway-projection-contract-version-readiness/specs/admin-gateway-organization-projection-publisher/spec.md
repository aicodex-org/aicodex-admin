## ADDED Requirements

### Requirement: Admin 不得单侧发明 projection payload contractVersion
Admin gateway projection payload versioning SHALL 与 API/gateway ingestion contract 保持一致。在 API/gateway owner 定义字段、兼容策略、mismatch 错误语义和 consumer 展示行为之前，Admin MUST NOT 单侧新增、要求或解释顶层 `contractVersion` 字段。

#### Scenario: 当前 payload 没有显式 contractVersion
- **WHEN** Admin 构建 gateway projection batch
- **THEN** payload SHALL 继续包含 `projectionBatchId`、gateway int64 `orgVersion`、`generatedAt`、`freshness`、`lineage` 和 `subjects[]`
- **AND** Admin SHALL NOT 将缺少 `contractVersion` 视为本地 build failure
- **AND** Admin fixture SHALL NOT 增加 API ingestion 尚未要求的 synthetic `contractVersion`

#### Scenario: 版本字段语义不混用
- **WHEN** operator、API owner 或 Insight consumer 排查 projection payload version
- **THEN** `lineage.sourceVersion` SHALL 表示 admin source snapshot version
- **AND** gateway `orgVersion` SHALL 表示 gateway projection ordering/freshness version
- **AND** subject `projectionVersion` SHALL 表示 subject content version
- **AND** 这些字段都 SHALL NOT 被记录为 payload schema `contractVersion`

#### Scenario: API 提出 contractVersion gap
- **WHEN** API/gateway owner 要求显式 payload `contractVersion` 或 `sourceContractVersion`
- **THEN** API/gateway owner SHALL 先定义字段名、可接受初始值、缺失字段兼容策略、mismatch 错误码和 provider/report 展示行为
- **AND** Admin SHALL 只在 API contract 被接受后，通过配对 Admin change 实现该字段
- **AND** Admin SHALL 更新 DTO、fixture、publisher tests、smoke assets 和 verification，且不改变 API/Insight owner boundaries
