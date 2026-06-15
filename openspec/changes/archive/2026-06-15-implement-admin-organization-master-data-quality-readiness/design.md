## Context

现有 projection producer 的输入快照已经集中在 `GatewayProjectionSnapshot`，其中包含：

- `SourceConnection`：来源状态、新鲜度和可信边界。
- `PlatformDepartment`、`PlatformMembership`、`PlatformUser`：组织主数据、部门关系和主体生命周期。
- `PlatformApiUserMapping`：gateway projection 需要的一等 `apiUserId` 映射。
- `OrgSyncBatch`：sourceVersion、orgVersion 和 source freshness lineage。

Platform API mapping 页面已经承载 mapping readiness 和 manual publish console，适合增加轻量质量 readiness 区域，避免新增独立入口和导航成本。

## Decisions

### 1. 只读质量 readiness 复用 projection snapshot

新增 service 只读取 Admin-owned snapshot，不读取 API/Gateway/Insight 数据库，不触发 publish。它使用和 projection builder 相同的组织、部门、成员、主体、映射和 source metadata 口径，避免出现另一个事实来源。

本 change 不新增数据库表或迁移。质量 readiness 是请求时从现有表构建的只读摘要，后续如果需要长期历史台账，应另开 change。

### 2. 输出稳定 status 与 reason aliases

status 规则：

- `blocked`：缺少可用 source/sync lineage、source disabled/stale/unavailable、存在重复 source key、成员关系引用缺失 active 用户、或没有任何可发布 active/tombstone 主体。
- `warning`：存在 orphan department、disabled/tombstone/unknown/conflicted/stale subject、未映射或不可信映射、成员关系引用缺失部门等需要 operator 处理但不必然阻断所有发布的质量缺口。
- `ready`：没有 blocked/warning reason，且具备至少一个可发布主体与可用 source lineage。

响应只输出 counts、aliases 和摘要，不输出完整组织树或用户明细。

### 3. mapping readiness 与 master data quality 分层

本 change 会复用 `PlatformApiUserMappingReadiness` 的分类思想，但输出层面聚焦组织主数据质量，不替代 mapping 管理 API，也不修改 mapping 写入流程。

### 4. UI 最小集成

在 Platform API mapping 页用户映射 tab 中增加 “组织主数据质量 readiness” 区域，展示 status、reason aliases、source/sync 摘要和质量 check 计数。该区域只读，不提供修复写入口。

API 路径使用现有 Platform API mapping 管理 API 风格：`GET /api/get-organization-master-data-quality-readiness?organization=<id>`。该接口要求管理员登录态，与 mapping readiness 一样只返回 Admin owner 范围内的脱敏诊断。

## Risks

- 质量规则需要保持保守：遇到无法判断或 source lineage 不完整时应 fail closed 为 `blocked` 或 `warning`，不能伪造成 ready。
- package 级覆盖率可能受 `object` 大包历史影响；归档时使用 changed-function coverage 和聚焦测试记录。
- 真实环境非空组织树、真实 publish 或 API/Gateway ingestion 不在本 change 验证范围内。
