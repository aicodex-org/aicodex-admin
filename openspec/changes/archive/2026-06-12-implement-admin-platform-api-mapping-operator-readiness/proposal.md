# implement-admin-platform-api-mapping-operator-readiness

## Why

`review-admin-platform-api-mapping-operator-readiness` 已确认 Admin 侧存在低风险 operator readiness gap：`PlatformApiUserMapping` 基础维护 API/UI 已存在，但 operator 缺少聚合的只读 readiness 入口，用于从 projection audit 的 `mapping_missing`、`mapping_untrusted`、lifecycle/source 不可信等诊断，收敛到最小 active/tombstone publishable subject 前置条件。

当前 60 fixture 写入和 `subjectCount>=1` 验证需要用户授权，不能在本 change 内执行。这个 change 只补 Admin owner 内部的只读诊断、筛选和 runbook，使 operator 能安全判断“缺什么”，而不是自动补写映射或发布授权事实。

## What Changes

- 新增 Admin-only 只读 Platform API mapping readiness 诊断能力，聚合 subject candidate 数量、blocked reason 分布、mapping 缺失/不可信、lifecycle/source/lineage/freshness 风险和 tombstone 候选。
- 扩展现有 Platform API mapping 管理页，增加只读 readiness 摘要、筛选入口和安全说明，帮助 operator 定位需要补映射或修正信任状态的主体。
- 补充 Bruno/runbook 文档，说明如何诊断 `mapping_missing`，如何使用脱敏 subject count signal，以及为什么 60 fixture 写入必须另行授权。
- 补充后端和前端测试，覆盖 active/tombstone readiness 分类、display/legacy 字段不作为 join key、只读接口不写 gateway authorization facts。

## Out of Scope

- 不自动创建、更新或确认 `PlatformApiUserMapping`。
- 不写 gateway authorization facts，不修改 API/Gateway/Insight。
- 不让 API/Insight 消费 Admin 管理页 JSON 或 observability JSON 做授权。
- 不执行 60 fixture 写入、DB 明细写入/清理、真实 gate、生产/类生产操作。
- 不用 `displayName`、手机号、邮箱、旧 `ExternalIdentity.Lineage.apiSubjectId` 或旧 `User.Properties.*apiUserId` 推断 gateway subject。

## Expected Outcome

operator 可以在 Admin 后台或 runbook 中看到：

- 当前组织是否具备 active/tombstone publishable subject 的只读 readiness 信号。
- blocked reason 分布，例如 `mapping_missing`、`mapping_untrusted`、`lifecycle_not_publishable`、`source_metadata_unavailable`、`lineage_freshness_unavailable`。
- 对应 remediation checklist：哪些条件需要由 Admin operator 补齐，哪些操作需要用户授权后另派 60 fixture 写入任务。
