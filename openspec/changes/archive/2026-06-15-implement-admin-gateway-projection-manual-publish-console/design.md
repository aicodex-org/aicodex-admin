## Context

现有 Admin projection producer 已分层为：

- `GatewayProjectionService.BuildAndPublishOrganization`：读取 Admin 主模型快照、构建 projection batch、调用 publisher。
- `GatewayProjectionObservabilitySnapshot`：返回脱敏运行态诊断，包括 publisher/refresh/latest publish/source freshness。
- `PlatformApiUserMappingReadiness`：解释 active/tombstone publishable subject 的 mapping 前置条件。

本 change 复用这些边界，不新增跨服务合同字段，不改变 gateway ingestion payload，不绕过 service-to-service publisher config。

## Decisions

### 1. API 只做受控 attempt，不做 source 或 mapping 写入

新增 manual publish API 只接受组织标识和可选 traceId/reason，调用既有 `GatewayProjectionService`。它不修改 `PlatformApiUserMapping`，不修改 `SourceConnection`，不写 gateway authorization facts。

### 2. Envelope 以 operator 排障字段为核心

返回对象包含：

- `status`：`ok` / `error`
- `accepted`、`idempotent`、`retryable`
- `projectionBatchId`、`orgVersion`、`sourceVersion`
- `subjectCount`、`activeSubjectCount`、`tombstoneSubjectCount`、`skippedSubjectCount`、`skippedByReason`
- `failureCategory`、`errorCode`、`durationMs`
- `freshnessExpiresAt`、`publisher`、`sourceConnectionSummary`、`readiness`、`disabledReasons`

这些字段用于 Admin operator 判断下一步，不代表 Gateway 授权事实。

### 3. UI 挂在现有 Platform API mapping 页面

Platform API mapping 页面已经承载组织映射、用户映射、readiness 诊断，适合放置 manual publish console。页面只显示脱敏 counts/status/category，不展示 token、私有 URL、完整组织树或完整下游响应。

### 4. 手动 publish 可因 readiness 不足被禁用

前端根据 readiness/source/publisher summary 提示禁用原因。后端仍保持最终 fail closed：即使前端误触发，配置缺失、source freshness 不可信、mapping 不可信或 build/publish 失败都通过稳定 result envelope 返回。

## Risks

- 手动 publish 是真实 producer 操作，会调用 gateway projection endpoint；本地/测试验证默认只跑 mock/service 单测，不做真实 60 publish。
- 若环境配置缺失，返回 `projection_token_missing` 或等价配置错误，不伪造成成功。
- 若 source/mapping readiness 缺口存在，返回稳定 blocked 分类，不扩大权限范围。
