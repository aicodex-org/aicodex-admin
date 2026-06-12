# Design

## 目标

本 change 只回答一个合同 readiness 问题：Admin 是否应主动在 gateway projection payload 中新增显式 `contractVersion`。

结论：当前不新增。原因是 `contractVersion` 是 ingestion contract 兼容性 gate 字段，只有 API/gateway consumer 明确要求并定义兼容策略后，Admin producer 才能按同一 contract 实现；否则 Admin 单侧新增字段会制造未被 consumer 认可的“影子合同”。

## 现有字段语义

- `lineage.sourceService`: 固定为 `aicodex-admin`，表示 payload 来源服务。
- `lineage.sourceVersion`: admin source snapshot version，例如 `OrgSyncBatch.OrgVersion` 或 `orgv-*`；它用于 lineage 排障和幂等诊断，不是 payload schema version。
- `lineage.digest`: admin 对当前 projection 内容的摘要，用于幂等和排障，不是 contract version。
- `orgVersion`: gateway ingestion 使用的 int64 projection version，用于排序、新鲜度和 latest 判定；不能和 admin 字符串 source version 或 payload schema version 混用。
- `subjects[].projectionVersion`: subject 级内容版本，随 lifecycle、部门、角色、岗位、freshness 或 orgVersion 变化；不是 payload schema version。

## 决策

### 1. 当前 Admin 不新增 `contractVersion`

Admin 主规格和实现继续保持当前 payload shape。Bruno/fixture 也不新增 `contractVersion`，避免 API ingestion 不消费该字段时出现测试和真实请求不一致。

### 2. API handoff 口径

如果 API/gateway 后续需要 payload schema gate，应先在 API owner change 中定义：

- 字段名，例如顶层 `contractVersion` 或 `sourceContractVersion`。
- 初始值，例如 `admin-gateway-organization-projection.v1`。
- 缺失字段的兼容策略：继续接受 v1 legacy payload，还是 fail closed。
- mismatch 错误码和 response envelope。
- projection status / export / report provider 展示字段来源。

Admin 收到 API contract gap 后，再开 implementation change 补 DTO、fixture、publisher test、Bruno smoke 和 verification。

### 3. 不扩大范围

本 change 不处理 60 publishable subject fixture 写入，不处理 `PlatformApiUserMapping` operator readiness，也不触碰 OIDC gateway routing optional 分支。

## 验证策略

- 运行 OpenSpec validate 和 `git diff --check`。
- 覆盖率 N/A：不改 Go 生产代码。
- 不执行 60 fixture 写入、数据库查询/清理、生产/类生产操作或真实 gate。
