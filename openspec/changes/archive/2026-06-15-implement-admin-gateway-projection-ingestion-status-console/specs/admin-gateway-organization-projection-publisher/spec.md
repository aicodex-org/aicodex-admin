## ADDED Requirements

### Requirement: Admin 必须提供 Gateway ingestion status 只读 operator 查询
Admin SHALL provide an admin-only read-only Gateway projection ingestion status query that consumes the API/Gateway owner `ingestion-status` contract and returns a sanitized operator envelope.

#### Scenario: Operator queries latest Gateway ingestion status
- **WHEN** an authorized Admin operator requests ingestion status with `latest=true` for an organization
- **THEN** Admin SHALL call the configured API/Gateway ingestion-status endpoint as a read-only request
- **AND** Admin SHALL use service-to-service authentication without exposing endpoint or token in the response
- **AND** Admin SHALL return Gateway owner status such as `accepted`, `applied`, `stale`, `conflict`, `lineage_invalid`, `unmapped_subjects` or `not_found`
- **AND** Admin SHALL NOT trigger publish, write Gateway facts, read Gateway/API/Insight databases, or use Insight scope/old cache/page fields as fallback

#### Scenario: Operator queries a specified projection receipt
- **WHEN** operator provides `projectionBatchId`, `orgVersion` or `sourceVersion`
- **THEN** Admin SHALL forward only those query keys to the Gateway ingestion-status contract
- **AND** Admin SHALL include a query summary in the response so the operator can see which keys were used
- **AND** Admin SHALL NOT include raw Gateway response, full projection payload, full organization tree or subject details

#### Scenario: Gateway status mapping is stable and fail-closed
- **WHEN** Gateway returns `applied`, `accepted`, `stale`, `conflict`, `lineage_invalid`, `unmapped_subjects` or `not_found`
- **THEN** Admin SHALL preserve the stable status alias and map it to an operator `failureCategory` or success category without treating `not_found` as success
- **AND** if Gateway is unavailable, configuration is missing, or the response cannot be decoded, Admin SHALL return `provider_unavailable`, `invalid_config` or `invalid_response`

#### Scenario: Ingestion status response is sanitized
- **WHEN** Admin returns ingestion status
- **THEN** the envelope SHALL include only status, reason code/category, freshness, lineage, aggregate subject counts, received/applied timestamps, duration and query summary
- **AND** the envelope SHALL NOT contain token, Cookie, private URL, raw Gateway response, full projection payload, complete organization tree, phone, email or subject details

### Requirement: Web admin 必须展示 Gateway ingestion status console
Admin web UI SHALL expose a Gateway projection ingestion status operator area near the existing Platform API mapping/readiness/manual publish context.

#### Scenario: Operator reviews Gateway owner ingestion status
- **WHEN** operator opens the mapping/projection console for an organization
- **THEN** the UI SHALL load a read-only latest ingestion status summary
- **AND** the UI SHALL display status alias, reason/failure category, subject counts, freshness/lineage and received/applied timestamps using stable tags
- **AND** the UI SHALL explain that Gateway ingestion status is owner receipt/status only and does not prove Insight/API authorization success
