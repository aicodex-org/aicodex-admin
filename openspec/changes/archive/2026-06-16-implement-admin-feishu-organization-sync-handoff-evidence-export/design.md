## Context

Feishu 组织同步目前已经产生三类本地安全证据：

- Sync run：正式同步的状态、阶段、触发方式、聚合计数、失败分类和 safe summary。
- Dry-run history：正式写入前的 snapshot/diff 聚合计数、诊断 alias、operator/request hash 和 retention/redaction metadata。
- User binding diagnostics：扫码登录与组织同步共用身份绑定时的冲突风险、blocked reason 和建议动作。

Handoff evidence 的价值在于统一这些证据，并明确哪些信息不能从 Admin 本地事实源推断，避免交接时误把“未验证真实租户”理解成“已通过运行态验收”。

## Design

### Backend read model

新增 `FeishuOrganizationSyncHandoffEvidenceService`。该服务只读查询 Admin 本地数据：

- `FeishuOrganizationSyncConfig`
- `FeishuOrganizationSyncRun`
- `FeishuOrganizationSyncDryRunHistory`
- `FeishuOrganizationSyncUserBindingConflictService`

Evidence 支持 `sourceType`：

- `run`：基于指定 runId 或最近 run 生成。
- `dry_run_history`：基于指定 historyId 或最近 dry-run history 生成。
- `latest`：优先最近 dry-run history，其次最近 run。

响应包含：

- source identity：`sourceType`、`sourceIdHash`、`sourceStatus`、`createdAt`
- safe source markers：`endpointMode`、`appAlias`、`tenantAlias`、`sourceConnectionIdHash`
- impact summary：department/user/membership counts、soft-disable summary、trigger summary
- binding conflict summary：status、riskLevel、counts、safe summary、blocked indicator
- readiness：`ready` / `blocked` / `no_run` / `unsupported`
- `blockedReasons`、`operatorNextActions`、`cannotInfer`
- redaction metadata：`applied=true`、版本号

### Readiness rules

- 未配置或未启用：`unsupported`。
- 没有 run/dry-run history：`no_run`。
- run/dry-run 失败、存在 high/critical binding conflict、diff conflict/invalid 计数大于 0：`blocked`。
- run/dry-run 成功且无阻断风险：`ready`。
- 只缺少外部运行态验证、Gateway/Insight 验收或真实租户权限结果时，写入 `cannotInfer`，不把它当成本地实现错误。

### API

新增只读 API：

- `GET /api/feishu-org-sync/handoff-evidence?organization=<org>&sourceType=<latest|run|dry_run_history>&sourceId=<id>`

该 API 复用飞书组织同步组织边界和 admin 鉴权。`sourceId` 只用于本地 run/history 查找，响应中只返回 hash，不回显原始 id。

### Frontend

在飞书组织同步页面增加“交接证据”只读区域：

- 展示 readiness/status、source type、source id hash、diff/run 聚合计数、binding conflict 摘要、blocked reasons、cannotInfer 和 redaction 标记。
- 支持刷新、复制 JSON、导出 JSON。
- 支持 source type 选择：最近证据、最近 run、最近 dry-run history。
- 覆盖 loading、empty、error、unsupported、no-run、blocked、ready 状态。

### Security

Evidence 只允许输出：

- stable hash / safe marker
- 聚合 count
- safe summary / reason alias / action enum
- retention/redaction metadata

Evidence 不允许输出真实 `appId`、tenant key、run/dry-run 原始 id、手机号、邮箱、真实姓名、完整组织树、token/Cookie、私有 URL、raw Contact payload 或任何 secret。

## Alternatives

1. 仅让 operator 手工复制 run/dry-run/binding 三块信息：实现成本低，但容易漏项，也没有统一脱敏边界。
2. 在 Gateway/Insight 侧生成 evidence：会跨越 Admin owner 边界，并让消费侧变成事实源，不适合当前 P0。
3. 推荐方案：Admin 本地聚合只读 evidence，后续真实租户运行态验证和 Gateway/Insight 验收作为独立 cannotInfer 或后续证据来源扩展。
