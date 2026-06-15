## ADDED Requirements

### Requirement: Admin 必须提供 Platform API mapping readiness 只读诊断
Admin SHALL provide an admin-only read-only readiness diagnostic for `PlatformApiUserMapping` so operators can identify publishable subject prerequisites without writing mappings, gateway authorization facts, or API/Insight data.

#### Scenario: Operator reads readiness summary
- **WHEN** operator requests readiness diagnostics for an Admin organization
- **THEN** Admin SHALL return counts for `active_publishable`, `tombstone_publishable`, `mapping_missing`, `mapping_untrusted`, `lifecycle_not_publishable`, `source_metadata_unavailable` and `lineage_freshness_unavailable`
- **AND** the response SHALL include generatedAt and organization-scoped filter metadata
- **AND** the endpoint SHALL NOT create, update or confirm `PlatformApiUserMapping`

#### Scenario: Readiness classifies active publishable subjects
- **WHEN** a platform user has matching `organizationId + adminSubject`
- **AND** `PlatformUser.LifecycleStatus=ACTIVE`
- **AND** `PlatformUser.MappingStatus=CONFIRMED`
- **AND** confirmed `PlatformApiUserMapping.ApiUserId` is present
- **THEN** readiness SHALL classify the subject as `active_publishable`

#### Scenario: Readiness classifies tombstone publishable subjects
- **WHEN** a platform user has a non-active lifecycle that requires tombstone projection
- **AND** an existing confirmed or disabled mapping still provides deterministic `ApiUserId`
- **THEN** readiness SHALL classify the subject as `tombstone_publishable`
- **AND** readiness SHALL NOT rely on subject absence to express deletion

### Requirement: Readiness diagnostics 必须保持 authority-safe
Admin SHALL keep readiness diagnostics scoped to Admin-owned mapping and source metadata. The diagnostics MAY show display or legacy candidate values as operator hints, but MUST NOT treat them as runtime projection join keys.

#### Scenario: Legacy and display fields stay diagnostic-only
- **WHEN** a subject has displayName, phone, email, old `ExternalIdentity.Lineage.apiSubjectId`, old `User.Properties.apiUserId` or old `User.Properties.aicodexApiUserId`
- **AND** no confirmed `PlatformApiUserMapping.ApiUserId` exists for the same `organizationId + adminSubject`
- **THEN** readiness SHALL classify the subject as `mapping_missing` or another blocked reason
- **AND** readiness SHALL NOT infer `apiSubjectId` from those values

#### Scenario: Readiness response is sanitized for handoff
- **WHEN** readiness diagnostics are logged, documented or used in smoke/runbook output
- **THEN** Admin SHALL use counts, categories and stable reason codes
- **AND** Admin SHALL NOT print token、Cookie、真实账号、手机号、邮箱、完整组织树、完整响应体或完整 organizationId

### Requirement: Platform API mapping UI 必须支持 operator readiness 筛选
Admin web UI SHALL provide an operator-facing read-only readiness surface near the existing Platform API mapping management page.

#### Scenario: Operator filters readiness from mapping page
- **WHEN** operator opens the Platform API mapping page for an organization
- **THEN** the UI SHALL display readiness counts or an equivalent summary
- **AND** the UI SHALL allow filtering by readiness category, mapping status and keyword
- **AND** the UI SHALL explain that `subjectCount=0 + mapping_missing` means no publishable subject fixture is ready, not full projection business success
