## ADDED Requirements

### Requirement: Platform API user mapping operator readiness 必须暴露可发布主体前置条件
Admin SHALL 提供面向 operator 的 `PlatformApiUserMapping` readiness 工作流，使授权 operator 能判断是否至少存在一个可发布 active 或 tombstone subject，且不读取 API/Insight 数据库、不写 gateway authorization facts。

#### Scenario: Operator 检查 active subject readiness
- **WHEN** operator 检查目标组织的 gateway projection publishability
- **THEN** Admin SHALL 暴露或记录 active publishable subject 需要匹配 `organizationId + adminSubject`
- **AND** `PlatformUser.LifecycleStatus` SHALL be `ACTIVE`
- **AND** `PlatformUser.MappingStatus` SHALL be `CONFIRMED`
- **AND** `PlatformApiUserMapping.MappingStatus` SHALL be `CONFIRMED`
- **AND** `PlatformApiUserMapping.ApiUserId` SHALL be non-empty
- **AND** source lineage, orgVersion/sourceVersion and freshness SHALL be available from Admin-owned source metadata

#### Scenario: Operator 检查 tombstone subject readiness
- **WHEN** operator 检查 disabled、deleted、conflicted、unknown 或 stale subject 的 tombstone projection readiness
- **THEN** Admin SHALL 暴露或记录生成 tombstone subject 所需的 non-active lifecycle 和 mapping state
- **AND** Admin SHALL 要求已有 confirmed 或 disabled mapping 继续提供确定的 `ApiUserId`
- **AND** Admin SHALL NOT 依赖 subject 缺失来表达删除

### Requirement: Platform API mapping diagnostics 必须保持 authority-safe
Admin SHALL 将 `PlatformApiUserMapping` 诊断和 operator 工作流限定在 Admin-owned identity mapping readiness 范围内。display metadata 和 legacy candidates MAY 用于诊断展示，但 MUST NOT 成为 projection/runtime join keys。

#### Scenario: Legacy 和 display 字段只作为诊断展示
- **WHEN** operator 看到 display name、phone、email、旧 `ExternalIdentity.Lineage.apiSubjectId`、旧 `User.Properties.apiUserId` 或旧 `User.Properties.aicodexApiUserId`
- **THEN** Admin SHALL 将这些值标记为 display、diagnostic 或 migration candidate data
- **AND** 除非同一 `organizationId + adminSubject` 已存在 confirmed `PlatformApiUserMapping.ApiUserId`，Admin SHALL NOT 将这些值发布为 `apiSubjectId`

#### Scenario: Mapping missing 可解释且不伪造成业务成功
- **WHEN** latest projection audit 存在 `subjectCount=0`，且 skipped subjects reason 为 `mapping_missing`
- **THEN** Admin SHALL 说明 producer observability 可诊断，但 publishable subject fixture 尚未就绪
- **AND** Admin SHALL NOT 将该状态描述为完整 projection 业务成功
- **AND** Admin SHALL 提供 operator remediation 所需的缺失 mapping 前置条件或 checklist

### Requirement: Operator workflow 必须支持低风险筛选和交接
Admin SHALL 提供 UI/API filters 或等价 runbook/checklist，使 operator 能在不暴露敏感标识的前提下定位 mapping readiness gaps。

#### Scenario: Operator 筛选 mapping readiness
- **WHEN** operator 排查 publishable subject readiness
- **THEN** Admin SHALL 支持按 organization、`mappingStatus`、keyword、conflict/duplicate state 和 publishable readiness category 筛选，或提供等价 documented checks
- **AND** diagnostics SHALL 区分 `mapping_missing`、`mapping_untrusted`、lifecycle not publishable、source metadata unavailable 和 lineage/freshness unavailable
- **AND** audit 或 smoke output SHALL 使用 counts、status 和 stable error codes，不输出 token、Cookie、真实账号、手机号、邮箱、完整组织树或完整 gateway response
