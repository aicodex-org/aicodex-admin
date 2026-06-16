# Design

## Current State

Admin 目前已有三层基础能力：

- 映射主模型：`PlatformApiUserMapping` 以 `organizationId + adminSubject` 为稳定键，保存 `apiUserId`、`mappingStatus`、`mappingSource` 和 lineage。
- 管理入口：`get-platform-api-user-mappings` / `update-platform-api-user-mapping` 提供查询和保存；web-admin `PlatformApiMappingPage` 支持编辑 `adminSubject`、`apiUserId`、`mappingStatus`、`mappingSource`。
- projection 消费：gateway projection builder 只发布拥有确定 `apiSubjectId` 的主体；缺失时记录 `mapping_missing`，不会用展示名、手机号、邮箱或旧属性猜测。

这些能力足以人工维护 confirmed mapping，但还不足以让 operator 高信心完成“至少一个 active/tombstone publishable subject fixture”的准备和交接。

## Gap

### 1. Publishable 前置检查不可见

operator 需要同时确认：

- `PlatformUser.OrganizationId` 等于目标组织。
- `PlatformUser.AdminSubject` 或稳定主体与映射 `adminSubject` 一致。
- active subject 需要 `LifecycleStatus=ACTIVE`、`PlatformUser.MappingStatus=CONFIRMED`、`PlatformApiUserMapping.MappingStatus=CONFIRMED` 且 `ApiUserId` 非空。
- tombstone subject 需要 non-active lifecycle，并且仍有 confirmed/disabled mapping 能提供 `ApiUserId`。
- `SourceConnection`、orgVersion/sourceVersion、lineage/freshness 可用。

当前页面和接口没有把这些条件聚合为“publishable readiness”结果，operator 只能跨页面、日志或代码反查。

### 2. 诊断维度不足

当前用户映射页支持关键字搜索，但没有一等状态筛选、冲突/重复风险视图、tombstone 候选视图或 `mapping_missing` 到缺失映射的反查入口。已有后端唯一性校验可防止重复写入，但 operator 在写入前缺少可扫描的诊断面。

### 3. 边界需要继续显式化

旧 `ExternalIdentity.Lineage.apiSubjectId` 和旧 `User.Properties.apiUserId/aicodexApiUserId` 只能作为迁移候选或展示诊断，不得在 runtime publish 中直接生效。operator 页面和 runbook 需要避免把这些旧字段描述为当前权威映射。

## Proposed Scope

后续 implementation change 应保持最小范围：

- 后端增加只读 readiness 诊断或在现有 mapping API 增加筛选参数，用于按 organization、mapping status、publishable readiness、skip reason 查询。
- 前端在现有 `PlatformApiMappingPage` 增加 operator 筛选/摘要，不新增跨服务写入。
- runbook/Bruno 补充脱敏 checklist：如何准备 active subject、可选 tombstone subject、如何验证 latest audit `subjectCount>=1`。
- 所有日志和验证记录只输出脱敏计数、状态和稳定 error code，不输出真实账号、手机号、邮箱、完整组织树或完整响应体。

## Non-Goals

- 不自动从 display metadata、手机号、邮箱、旧 lineage 或旧 user properties 生成 runtime confirmed mapping。
- 不写 gateway authorization facts。
- 不让 API/Insight 直连或消费 Admin 管理页面 JSON。
- 不在本 change 中执行 60 写入。

## Verification Strategy

- OpenSpec validate 和 diff check。
- 若后续实现生产代码，按受影响 Go package 和 web-admin 现有测试脚本验证。
- 60 fixture 写入必须由用户授权后执行；未授权时只能提供 operator checklist 和脱敏 smoke 命令。
