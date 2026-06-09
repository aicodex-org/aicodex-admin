## Context

`admin-gateway-organization-projection-publisher` 已经定义并实现 admin 到 gateway 的 projection batch builder、HTTP publisher、服务间 Bearer 鉴权、脱敏审计和 WeCom 同步成功后的可配置触发点。API 侧现在确认 provider 端点可用，剩余风险是 freshness TTL 为 1800 秒；如果没有周期 refresh，gateway projection 会在同步后半小时过期。

本 change 的核心不是重新定义 projection contract，而是让 admin 对同一份平台组织主模型做周期性重新发布，持续刷新 `generatedAt`、`freshness.expiresAt`、batch digest 和 subject `freshnessExpiresAt`。API 侧会补同 `orgVersion` 多 batch latest 判定，因此 admin refresh 不能为了续期 freshness 强行递增 `orgVersion`。

## Goals / Non-Goals

**Goals:**

- WeCom 同步成功后继续立即发布 admin -> gateway projection。
- 增加 admin 进程内 refresh worker，按小于 API TTL 的周期重新发布当前组织 projection。
- refresh worker 只读取 admin 平台组织主模型，复用既有 projection service 和 publisher。
- 组织未变化时 refresh 保持同一个 gateway `orgVersion`，只生成新的 `projectionBatchId`、subject `projectionVersion` 和 freshness 窗口。
- 全量 refresh 包含 active subjects，并以 disabled/deleted/conflicted/unknown lifecycle subject 表达 tombstone，不靠缺失表达删除。
- worker 运行、跳过、失败和成功日志脱敏，不能输出 endpoint、token、Cookie、完整认证头或真实私有环境信息。
- 在 60 测试环境验证 projection-status 超过 1800 秒仍保持 ok。

**Non-Goals:**

- 不改变 gateway projection ingestion contract，不新增 API/Insight 字段。
- 不实现 gateway resource authorization facts、权限矩阵、authorization audit 写入或 runtime allow/deny。
- 不让 Insight 或 API 直连 admin 源库补算 projection。
- 不把 Insight report scope、部门用量 `apiUserIds` 或展示名作为 gateway authorization key。
- 不引入分布式调度系统；第一版使用 admin 进程内轻量 worker。

## Decisions

### 1. 复用既有 GatewayProjectionService

refresh worker 调用 `GatewayProjectionService.BuildAndPublishOrganization(ctx, organizationID, traceID)`，不新增第二套 builder 或 HTTP client。

这样可以保证 WeCom 成功触发和定时 refresh 使用同一套 mappingStatus、lifecycle、orgVersion、freshness、lineage、retry 和脱敏审计语义。worker 只负责“哪些组织、何时触发”，不负责解释授权事实。

### 2. 从 admin 平台组织主模型枚举组织

worker 从 `OrgSyncBatch` 中找出已经形成来源快照版本的 organizationId。第一版只刷新已有同步批次的组织，避免对空组织、`built-in`、无 source batch 的组织制造 projection，也避免 builder 在缺少批次时回退到 `generatedAt` 导致 `orgVersion` 因 refresh 漂移。

如果组织枚举失败，worker 记录脱敏错误并等待下一轮，不回退到 WeCom 原始表、Insight 缓存或 API 源库。

### 3. 配置化周期与启动门控

新增配置：

- `gatewayOrganizationProjectionRefreshEnabled`: 是否启动 refresh worker，默认跟随 `gatewayOrganizationProjectionEnabled` 关闭态，不单独扩大默认行为。
- `gatewayOrganizationProjectionRefreshIntervalSeconds`: refresh 周期，默认 900 秒。
- `gatewayOrganizationProjectionRefreshInitialDelaySeconds`: 进程启动后首次 refresh 延迟，默认 60 秒，避免启动时和数据库初始化、同步任务同时抢资源。
- `gatewayOrganizationProjectionRefreshBatchSize`: 单轮最多刷新组织数，默认 50。

refresh 周期必须小于 `gatewayOrganizationProjectionFreshnessTTLSeconds`。如果配置非法或周期不小于 TTL，worker 记录配置错误并使用安全默认值，不能用大于等于 TTL 的周期启动。

### 4. 幂等和并发控制

worker 每轮串行刷新组织，并使用本进程互斥避免重入。同一轮内同一组织只发布一次。HTTP 层仍沿用 publisher 的“同一 request body 有限重试”语义。

由于每次 refresh 都会更新 freshness 窗口，`projectionBatchId`、digest 和 subject `projectionVersion` 会随 freshness 变化；但只要组织来源快照未变化，gateway `orgVersion` 必须保持来自最新 `OrgSyncBatch.FinishedAt` 的同一个数值。API ingestion 负责在同 `orgVersion` 多 batch 中按 latest freshness 判定。Admin 不写 gateway 授权事实，只发布当前组织 projection 输入。

### 5. 全量 refresh 显式包含 tombstone subject

Refresh 使用全量 subject projection：active 主体正常发布；已经离职、删除、禁用或冲突但仍有稳定 `apiSubjectId` 的主体也要发布为小写 lifecycle subject，例如 `disabled`、`deleted`、`conflicted` 或 `unknown`。Gateway 侧据此删除或收敛 runtime 授权覆盖。

Admin 不能通过“本次 subjects 中缺失某人”表达删除，因为缺失也可能是映射缺失、配置错误或 provider unavailable。缺少可信 mapping 的主体仍 fail closed 并进入 skipped summary，不猜测 gateway subject。

Active subject 仍必须使用 `CONFIRMED` mapping；非 active tombstone subject 可以使用 `DISABLED` mapping 中已有的确定 `apiSubjectId`，只用于显式撤销或收敛 gateway 主体，不用于扩大 active 授权范围。

### 6. 运行态验证不写敏感环境信息

`verification.md` 只记录环境别名、路径、状态、脱敏日志信号和 projection-status 结论。不得写真实 IP、token、账号、Cookie、完整 DSN 或私有 URL。

## Risks / Trade-offs

- [多实例 admin 同时 refresh] -> 第一版只做进程内互斥，依赖 gateway ingestion 幂等承接多实例重复推送；日志按 organization/traceId 排查。
- [refresh 周期配置过大导致再次 expired] -> 启动时校验 interval < freshness TTL，不满足时使用安全默认值并记录 warning。
- [组织枚举过宽] -> 只枚举已有平台组织主模型/来源连接/同步批次的 organizationId，避免对空组织制造 projection。
- [gateway 临时不可用] -> 沿用 publisher retry 和 provider_unavailable 分类，下一轮自动再次 refresh，不降级为本地补算授权。

## Migration Plan

1. 合入代码后，在测试环境配置 projection endpoint/token、freshness TTL 和 refresh interval。
2. 部署 admin 分支，确认启动日志出现 refresh worker enabled 或 disabled 的脱敏状态。
3. 触发一次 WeCom 同步成功，确认即时 publish accepted 或 idempotent。
4. 等待超过 API freshness TTL，查询 projection-status，确认状态仍为 ok。
5. 如出现异常，可关闭 `gatewayOrganizationProjectionRefreshEnabled` 或 `gatewayOrganizationProjectionEnabled` 回滚 refresh，不影响既有 WeCom 同步数据。
