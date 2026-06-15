## Context

`add-feishu-organization-sync` 已提供 Feishu/Lark 组织架构同步的 P0 能力：配置、连接测试、手动全量、定时调度、run 列表/详情、本地对象写入和平台主数据投影。当前 run 记录已有 `status`、`stage`、`errorCode`、`errorMessage`、拉取/写入/禁用计数和时间字段，但这些字段偏执行内部语义，operator 仍需要从日志或代码推断：

- 失败发生在配置、token、Contact API、upsert、投影、软禁用还是调度派发。
- 失败原因属于凭证、权限、限流、租户不可用、契约不匹配、映射冲突、投影失败还是未知。
- 当前是否可以安全重试，还是需要先修凭证、授权通讯录、等待限流或人工排查。
- 展示给前端和报告的统计是否已脱敏，不包含完整组织树、用户列表、手机号、邮箱、`open_id`、`user_id` 或 raw response。

真实飞书/Lark Contact v3 租户验证仍依赖外部凭证和权限，本 change 只做本地可测试的产品能力、合同和 fail-closed 行为。

## Goals / Non-Goals

**Goals:**

- 为 Feishu sync run 提供稳定诊断对象，包含 `failedStage`、`failureCategory`、`reasonCode`、`retryReadiness`、`operatorAction`、`safeSummary`、`stats` 和时间信息。
- 在 run 列表/详情 API 中输出诊断，或提供 `/api/feishu-org-sync/runs/:runId/diagnostics` 诊断 endpoint，确保前端无需解析 raw error。
- 将后端失败点映射到规范阶段：`config_validation`、`tenant_token`、`department_fetch`、`user_fetch`、`upsert_department`、`upsert_user`、`upsert_membership`、`projection`、`soft_disable`、`scheduler`。
- 将失败分类映射到稳定 reason/action：`reasonCode` 使用 `missing_secret`、`invalid_app_credentials`、`contact_scope_missing`、`tenant_unavailable`、`rate_limited`、`contract_mismatch`、`mapping_conflict`、`projection_failed`、`partial_sync`、`unknown`；`retryReadiness` 表示重试状态，`operatorAction` 表示下一步操作建议。
- 前端在飞书同步页面以表格/详情方式展示诊断字段、关键 counts、耗时和安全错误摘要。
- 用 mock/contract/fail-closed 测试覆盖诊断归一化、脱敏、API detail unavailable 和前端展示。

**Non-Goals:**

- 不读取真实 secret，不触发真实租户同步，不写真实租户 fixture。
- 不把直属上级、部门负责人纳入管理范围或 Insight 过滤。
- 不改变 API/Insight owner 边界，不改平台主数据 authority。
- 不引入通用跨 provider 诊断框架；本 change 聚焦 Feishu/Lark，可为后续 provider 抽象保留清晰边界。
- 不把 operator action 做成自动修复或自动重试任务；本次只输出 readiness/action 和可手动重试入口状态。

## Decisions

### 1. 诊断对象优先派生，失败点补充稳定错误码

从 `FeishuOrganizationSyncRun` 现有字段派生 `FeishuOrganizationSyncRunDiagnostics`：阶段、分类、retry readiness、operator action、脱敏统计和 duration 均可由 run 的状态、stage、errorCode、errorMessage、时间和计数字段计算。执行路径在明确失败点时继续写入更稳定的 `errorCode`，例如 `missing_secret`、`tenant_token_failed`、`department_fetch_failed`、`user_fetch_failed`、`upsert_department_failed`、`projection_failed`。

原因：派生对象兼容已有 run，不需要迁移；稳定错误码能让新失败更可诊断，同时旧 run 也能得到 `unknown` 或近似分类。

备选：新增 run diagnostics 表。暂不采用，因为本 change 不需要保留多条诊断事件，也不应引入额外迁移和清理语义。

### 2. 阶段归一化和 UI 文案由后端给出机器字段，前端只做轻量 label

后端输出稳定枚举：`failedStage`、`failureCategory`、`reasonCode`、`retryReadiness`、`operatorAction`。前端只映射为短标签/Tag，不用从错误文本做分类。

原因：错误分类是业务合同，应由后端集中维护；前端解析文本会造成语言、脱敏和兼容问题。

枚举约定：

- `failedStage`：失败发生的业务阶段，例如 `config_validation`、`tenant_token`、`department_fetch`、`user_fetch`、`upsert_department`、`upsert_user`、`upsert_membership`、`projection`、`soft_disable`、`scheduler`。
- `failureCategory`：面向聚合筛选的粗分类，例如 `configuration`、`credentials`、`permission`、`provider`、`contract`、`local_apply`、`projection`、`partial_sync`、`unknown`。
- `reasonCode`：面向排障的具体原因，例如 `missing_secret`、`invalid_app_credentials`、`contact_scope_missing`、`tenant_unavailable`、`rate_limited`、`contract_mismatch`、`mapping_conflict`、`projection_failed`、`partial_sync`、`unknown`。
- `retryReadiness`：是否适合重试，例如 `safe_retry`、`wait_rate_limit`、`not_ready`、`unknown`。
- `operatorAction`：下一步操作建议，例如 `fix_credentials`、`grant_contact_scope`、`wait_rate_limit`、`inspect_mapping_conflict`、`inspect_projection`、`manual_review`、`unknown`。

### 3. 脱敏统计只输出聚合 counts 和安全摘要

诊断 stats 只包含 `departmentCount`、`userCount`、`membershipCount`、`disabledCount`、`durationMs`、`startedAt`、`finishedAt`、`failedStage` 等聚合字段。`safeSummary` 继续通过现有安全错误文本处理，并对新增诊断输出执行 secret/token/Contact ID redaction 测试。

原因：operator 需要判断规模和失败位置，不需要也不应在诊断对象中看到完整组织树、用户列表、手机号、邮箱、`open_id`、`user_id` 或 raw response。

### 4. 手动 retry 使用现有手动全量入口，新增 readiness/action 而非新增后台 job

当 `retryReadiness=safe_retry` 时，前端可展示可重试状态并复用现有“开始全量同步”动作；当 action 指向凭证、权限、限流、映射冲突或投影排查时，只给出短操作建议，不自动重试。

原因：Feishu 同步是全量差异任务，现有手动入口已处理运行锁、stale run 和配置读取；新增自动 retry job 会引入调度和幂等复杂度，不属于本 change。

## Risks / Trade-offs

- 旧 run 的 `errorCode` 粒度较粗 → 通过派生规则给出 best-effort 分类，无法确定时返回 `unknown`，不伪造确定原因。
- 不新增 diagnostics 表 → 无法追踪一次 run 内多个失败事件；P0.5 诊断只展示最终失败点和聚合统计。后续如需要事件流，可在独立 change 增加 timeline。
- 错误文本可能包含 provider 返回片段 → 诊断输出必须复用脱敏函数并增加测试，前端不得展示 raw response。
- 真实 Contact v3 权限错误码可能与 mock 不完全一致 → 本地用 contract/fail-closed 分类常见状态，真实租户验证作为后续 runtime gate。
- 前端新增列可能造成表格拥挤 → 采用短标签、聚合 counts 和详情区，避免大段说明文案。
