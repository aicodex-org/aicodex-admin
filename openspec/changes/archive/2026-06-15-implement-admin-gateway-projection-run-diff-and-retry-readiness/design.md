## Context

现有 Admin projection producer 分层如下：

- `GatewayProjectionService.BuildAndPublishOrganization`：读取 Admin 主模型快照、构建 projection batch、调用 publisher。
- `GatewayProjectionManualPublishService`：执行受控 manual publish attempt，并返回脱敏 result envelope。
- `GatewayProjectionObservabilitySnapshot`：维护进程内 latest publish/refresh 观测结果。
- `PlatformApiUserMappingReadiness`：解释 active/tombstone publishable subject 的 mapping 前置条件。

本 change 在这些 Admin-owned 数据上增加只读 readiness 视图。由于仓库当前没有跨进程真实 run store，本次不发明跨 owner 持久源；指定 run 只支持校验当前 latest attempt 的 `traceId` 或 `projectionBatchId`，不把历史查询伪造成持久审计。

## Decisions

### 1. Run readiness 只读，不触发 publish

新增查询 API 只执行 Admin 当前 snapshot 的 dry-run build 和 latest publish 观测读取。它不调用 publisher，不写 Gateway，不修改 mapping/source/sync 数据，也不读 API/Gateway/Insight runtime facts。

### 2. Diff 以 Admin source 与 latest publish attempt 对比

摘要包含：

- `source.organizationId`、`source.sourceVersion`、`source.orgVersion`
- `target.contractVersionStatus`：遵循主规格，不单侧发明 payload `contractVersion`；当前固定表达为 `not_declared_by_gateway_contract`
- `target.projectionVersionSample` / `target.projectionVersionCount`：只从已构建 subject 的 `projectionVersion` 聚合得出，不返回完整 subject 明细
- 当前 dry-run subject counts：`subjectCount`、`activeSubjectCount`、`tombstoneSubjectCount`、`unmappedSubjectCount`、`invalidSubjectCount`
- latest run counts 与 failure alias
- `diff`：sourceVersion、orgVersion、projectionBatchId、subjectCount、active/tombstone count 是否变化

这些字段只服务 operator 排障，不表示下游 Gateway 已接受或正在使用该 projection。

### 3. Retry readiness 使用稳定 action 分类

服务返回 `retry.readiness` 和 `retry.operatorAction`：

- `safe_retry`：source 与 latest run 未变化，latest failure 属于 transient publisher/gateway unavailable 或 latest run 明确 retryable。
- `wait_source_refresh`：source freshness stale/unavailable、source connection disabled/missing，或当前 sourceVersion/orgVersion 相对 latest run 变化，需要先等待/触发 Admin source refresh。
- `fix_mapping_or_subject`：当前 dry-run 存在 unmapped/invalid，或 latest failure 属于 mapping/lifecycle/source-data 问题。
- `fix_publisher_config`：publisher disabled/token missing。
- `inspect_gateway_contract`：latest failure 属于 gateway contract mismatch，不能盲目 retry。
- `unknown`：缺少 latest run 或缺少足够信号。

分类必须 fail closed：不确定时不返回 `safe_retry`。

### 4. UI 只展示脱敏摘要和下一步

Platform API mapping 页面新增 run readiness 区块，靠近已有 readiness/manual publish console。页面展示 counts、last failure alias、retry action、diff tags，不展示 token、私有 URL、完整组织树、subject 明细或 raw gateway response。

## Risks

- 当前 latest publish 是进程内观测结果，不是持久历史审计；重启后可能为空。本 change 明确在 API 响应中标记 `runReference.available=false`。
- 如果未来引入持久 publish attempt history，可在相同 DTO 下扩展 store；本 change 不为了未来假设加入数据库迁移。
- `safe_retry` 只代表 Admin producer 视角的 retry readiness，不代表 Gateway/API/Insight 授权成功。
