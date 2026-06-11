# stabilize-admin-gateway-projection-publishable-subject-fixture-readiness

## Why

60 环境的 admin gateway projection observability 只读 smoke 已通过，但 latest audit 显示 `subjectCount=0`、`skippedSubjectCount=1049`，skip reason 为 `mapping_missing`。这证明 producer 可观测性可用，但不能证明存在 active 或 tombstone subject 的完整 projection 业务成功。

只读 review 已确认：runtime projection 不再消费旧 `ExternalIdentity.Lineage.apiSubjectId` 或 `User.Properties.apiUserId/aicodexApiUserId`，而是只消费同 `organizationId + adminSubject` 的一等 `PlatformApiUserMapping.ApiUserId`。因此需要一个很小的 readiness change，把可发布 subject 的 admin 前置条件、测试覆盖和 60 操作清单固化下来，避免后续 agent 误把 `displayName`、手机号、邮箱、Insight scope 或 admin observability 输出当成映射来源。

## What Changes

- 固化 active subject 的最小前置条件：稳定 `AdminSubject`、`LifecycleStatus=ACTIVE`、`PlatformUser.MappingStatus=CONFIRMED`、confirmed `PlatformApiUserMapping.ApiUserId` 非空、可用 source/org version。
- 固化 tombstone subject 的最小前置条件：非 active lifecycle，且 confirmed 或 disabled mapping 能提供确定 `ApiUserId`。
- 补充 Bruno/readme 只读 smoke 的可选断言，用于在受控 60 fixture 准备完成后验证 `subjectCount>=1` 和 tombstone count。
- 补充 OpenSpec delta 和 verification，明确本 change 不执行真实 60 fixture 写入，真实写入必须由 operator 明确授权。

## Impact

- 只影响 admin owner 范围内的 projection fixture readiness 文档、OpenSpec 和只读 smoke 断言。
- 不修改 API/Insight，不写 gateway authorization facts，不改变 admin-to-gateway projection contract。
- 不提交真实 token、Cookie、账号、手机号、邮箱、完整组织结构或完整 gateway 响应。
