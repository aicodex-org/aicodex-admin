# Verification

> 本文件只记录脱敏验证结果。不得写入真实 IP、私有 URL、token、Cookie、真实账号、手机号、邮箱、完整组织明细或完整响应体。

## 2026-06-11 本地验证

### OpenSpec

- `openspec validate stabilize-admin-gateway-projection-publishable-subject-fixture-readiness --strict`
  - 结果：通过。
- `openspec validate --changes --strict`
  - 结果：通过，4 个 active change 校验通过。
- `openspec validate --specs --strict`
  - 结果：通过，14 个主规格校验通过。

### 测试覆盖复核

- `rg -n "TestBuildGatewayProjectionBatch(FailsClosedForMappingsAndLifecycle|UsesPlatformApiUserMapping|DoesNotUseLegacyIdentityLineageAtRuntime|PublishesLifecycleTombstoneSubjects)" admin\object\gateway_organization_projection_test.go`
  - 结果：已确认现有 builder 聚焦测试覆盖：
    - `mapping_missing` 分类。
    - confirmed `PlatformApiUserMapping.ApiUserId` 生成 active subject。
    - 旧 `ExternalIdentity.Lineage.apiSubjectId` 不作为 runtime publish 来源。
    - non-active tombstone subject 发布。

### 覆盖率

- 结果：N/A。
- 原因：本 change 未修改 Go 生产代码或 Go 测试代码，只补充 OpenSpec、Bruno 只读断言和 operator checklist。现有 Go 聚焦测试已覆盖本 change 固化的业务规则。

### 60 fixture

- 结果：未执行真实 60 fixture 写入、数据库明细查询或清理。
- 原因：该操作涉及测试环境数据写入，需要用户明确授权。本 change 只准备脱敏 operator checklist 和只读 smoke 断言。
- 后续执行条件：
  - 私有环境设置 `gatewayProjectionRequireLatestAudit=true`。
  - active fixture 准备完成后设置 `gatewayProjectionMinSubjectCount=1`。
  - tombstone fixture 准备完成后可设置 `gatewayProjectionMinTombstoneSubjectCount=1`。
  - 验证记录只记录脱敏摘要，不写真实账号、手机号、邮箱、完整组织结构、token、Cookie 或完整 gateway 响应。

### Diff 检查

- `git diff --check`
  - 结果：通过。
