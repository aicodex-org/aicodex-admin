# improve-admin-platform-api-mapping-operator-remediation-guidance

## Why

现有 `PlatformApiUserMapping` readiness API、管理页摘要和 Bruno README 已能暴露 `active_publishable`、`mapping_missing`、`mapping_untrusted`、`lineage_freshness_unavailable` 等分类，但 operator 仍需要把这些稳定分类人工翻译成可执行排查步骤。这个 gap 容易让后续验证把 `subjectCount=0 + mapping_missing` 误写成完整 projection 成功，或把 display/phone/email/legacy lineage 当作修复依据。

本 change 在 Admin owner 边界内补齐只读 remediation guidance，使 operator 能直接看到每个 readiness category 的下一步、最小解除条件和禁止外推边界。它不写真实 fixture、不查询真实 DB、不触碰 API/Insight，也不自动确认任何 mapping。

## What Changes

- 扩展 Platform API mapping readiness 响应，返回按 readiness category 分组的稳定 remediation guidance。
- 在 Platform API mapping 管理页展示 remediation guidance，使筛选、摘要和候选 subject 的排查动作在同一只读面板中完成。
- 更新 Bruno/runbook 文档，说明如何记录 guidance、如何处理 `mapping_missing` / `mapping_untrusted` / lifecycle/source metadata/freshness 类原因，以及哪些动作必须另行授权。
- 补充聚焦测试，覆盖 guidance contract、前端展示和脱敏/只读边界。

## Out of Scope

- 不创建、更新、确认或清理真实 `PlatformApiUserMapping`。
- 不查询、写入或清理真实 DB，不执行生产或类生产变更。
- 不触碰 API/Insight 仓库，不写 gateway authorization facts。
- 不把 display name、手机号、邮箱、旧 `ExternalIdentity.Lineage.apiSubjectId` 或旧 `User.Properties.*apiUserId` 当作 projection join key。
- 不新增跨服务 contract 字段；guidance 只服务 Admin operator 排障。

## Expected Outcome

operator 能在只读 API/UI/runbook 中看到：

- 每个 readiness category 的稳定 remediation code、说明、操作步骤和最小解除条件。
- `mapping_missing`、`mapping_untrusted`、lifecycle/source metadata/freshness gap 的不同处理方式。
- `subjectCount=0 + mapping_missing` 不是完整 projection 业务成功，真实 fixture 写入或 subject count gate 仍需用户授权。
