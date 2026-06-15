## Context

`gatewayProjectionObservabilityPreflight` 已能判断单个 `/api/gateway-projection/observability` 响应是否包含当前 source freshness shape，并使用 `environment_deploy_stale`、`no_publishable_subjects` 和 `sanitization_failed` 等稳定 alias fail closed。另一个已归档 change 已在 Admin 内提供 `/api/get-platform-api-user-mapping-readiness` 的只读 mapping readiness 与 remediation guidance。

本 change 不新增数据库读写，也不改 mapping 页面或 API 实现；它把这些只读诊断汇总为 operator 可执行 summary，让值班人员用一个入口判断下一步应找 Admin deploy/source owner、Admin mapping operator、fixture owner，还是继续等待受控测试窗口。

## Goals / Non-Goals

**Goals:**

- 提供可单测、可 Bruno 复用的 gateway projection readiness summary 纯函数脚本。
- Summary 输出只包含脱敏 alias、status、reason、counts、owner handoff 和最小解除条件。
- 保留 source freshness preflight 的 fail-closed 语义，不把旧 deployment shape、缺 latest audit 或缺 source summary 当作成功。
- 使用可选 mapping readiness 响应归纳 `mapping_missing`、`mapping_untrusted`、`source_metadata_unavailable`、`lineage_freshness_unavailable`、`active_publishable` 和 `tombstone_publishable` 前置。
- README/runbook 说明哪些结果可以外推，哪些只能作为 Admin producer/operator 诊断。

**Non-Goals:**

- 不修改 API、Insight、gateway 或它们的数据库。
- 不写、查询或清理真实 active/tombstone fixture。
- 不触发 gateway projection publish、refresh、mapping confirm 或 gateway authorization fact 写入。
- 不把 display name、phone、email、legacy lineage 或 user properties 作为 runtime join key。
- 不修改 Platform API mapping 页面、controller、object 或测试文件。

## Decisions

1. **脚本层组合，只读输入。** 新增 `gatewayProjectionReadinessSummary.js` 接收 observability 响应、可选 mapping readiness 响应和 operator 选项，复用现有 preflight 规则，不直接发 HTTP、不读取文件、不持有 token。
2. **稳定 alias 优先。** Summary 将旧部署 shape 映射为 `environment_deploy_stale`，subject count 不足映射为 `no_publishable_subjects`，mapping 缺口映射为 `mapping_missing`，source/freshness 缺口映射为 `source_connection_stale` 或 `lineage_freshness_unavailable`，敏感字段映射为 `sanitization_failed`。
3. **owner handoff 明确。** 每个阻断项携带 owner 和最小解除条件，例如 Admin deploy owner 更新运行包、Admin mapping operator 维护 confirmed `PlatformApiUserMapping.ApiUserId`、fixture owner 准备受控 subject。
4. **Bruno 入口不强依赖真实 mapping readiness。** Summary 请求默认读取 observability；当 operator 已通过只读接口取得脱敏 mapping readiness 响应时，可用 `gatewayProjectionMappingReadinessResponse` 私有变量传入。未提供该变量时 summary 将 mapping readiness 标记为 `not_checked`，避免隐式查询真实数据。

## Risks / Trade-offs

- **Bruno 多请求共享响应有限。** 采用独立 summary 请求的 after-response 脚本，并在 README 提供 Node dry-run 方式；mapping readiness 可由脚本函数在测试中直接传入，也可由后续 Bruno runner 扩展成 request chain。
- **没有真实环境 fixture。** 本 change 只验证 summary 逻辑和脱敏输出，不能证明远端测试环境已部署新包或已有可发布 subject。
- **Alias 可能较粗。** Summary 同时输出 `reason`、counts 和 owner handoff，避免 operator 只看到单个 alias 后误判根因。
