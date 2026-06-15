## Context

Feishu/Lark 组织同步已有 P0 写入链路：配置读取、Contact snapshot 拉取、`ApplyFullSnapshot` 写入本地 Group/User/Feishu 映射、平台主数据投影、软禁用和 run diagnostics。当前管理员只能通过连接测试确认凭证基本可用，或直接启动真实全量同步；缺少一个只读 preview 来评估本次同步对 Admin-owned 主数据的影响。

dry-run preview 必须复用现有 snapshot contract 和身份映射规则，但不能复用会写入数据库的 apply 函数。它服务于 Admin 生产侧 operator 决策，不产生 Gateway authorization facts，也不是 Insight scope/filter 的依据。

## Goals / Non-Goals

**Goals:**

- 新增 Feishu/Lark dry-run preview API，使用已保存或请求中的配置拉取一次 Contact snapshot 并计算只读 diff。
- 返回部门、用户、成员关系的 create/update/soft-disable/unchanged/conflict/invalid 聚合计数和 reason counts。
- 输出 source/tenant/app alias、snapshot aggregate、safe diagnostics 和 preview 时间，不返回完整组织树、用户列表、手机号、邮箱、Contact 标识或 raw payload。
- 在凭证缺失、权限不足、真实运行态授权不可用、快照契约异常时 fail-closed，返回稳定 reason/action。
- Web Admin 提供紧凑 preview console，展示 diff summary、风险标签、失败诊断和最近 preview 摘要。
- 用 mock/contract/fail-closed 测试证明 dry-run 不写入本地业务表和平台主数据。

**Non-Goals:**

- 不读取真实 secret，不触发真实租户同步，不写真实租户 fixture。
- 不保存完整 preview payload、外部 profile、手机号、邮箱、token、secret 或完整组织树。
- 不新增 Gateway authorization facts，不读取或修改 API/Insight 仓库。
- 不改变真实同步 apply 语义，不替代手动全量同步按钮。
- 不做直属上级/部门负责人管理范围和 Insight 过滤。

## Decisions

### 1. 新增独立 dry-run preview service，复用 snapshot client，不调用写入型 apply

新增 `FeishuOrganizationSyncDryRunPreviewService` 或等价 helper，流程为：

1. 校验目标组织、管理员权限和配置。
2. 对 masked secret 使用已保存配置补全；缺少可用 secret 时返回 `credential_missing` 诊断。
3. 使用现有 `FeishuOrganizationSnapshotClient` 拉取 token、部门、用户和 user-department snapshot。
4. 用只读 store 查询现有 Group/User/Feishu mapping/membership/platform records，计算 diff。
5. 返回 summary 和 diagnostics，不创建 run，不调用 `ApplyFullSnapshot`，不写任何业务表。

原因：真实 apply 函数承担 upsert、软禁用和平台投影职责，给它加 dryRun flag 容易让写路径遗漏保护；独立只读 preview 更容易验证“不写入”。

备选：给 `ApplyFullSnapshot` 增加 dryRun 参数。暂不采用，因为它会把 preview 和写入路径耦合，增加误写风险。

### 2. Diff 结果以聚合 summary 为主，最多保留脱敏样例

后端响应字段包含：

- `status` / `diagnostics`：成功或失败诊断。
- `source`：`organization`、`endpointMode`、`appAlias`、`tenantAlias`、`previewedAt`。
- `snapshotStats`：snapshot 中部门、用户、成员关系数量。
- `diff`：`departments`、`users`、`memberships` 各自的 `toCreate`、`toUpdate`、`toSoftDisable`、`unchanged`、`conflict`、`invalid`。
- `reasonCounts`：如 `missing_parent_department`、`missing_user_identifier`、`unmapped_department`、`duplicate_external_identifier`、`would_soft_disable`。

原因：operator 的第一层决策需要规模和风险，不需要也不应看到完整 Contact 明细。若实现需要样例，样例必须只包含本地安全名称或 hash/alias，不包含手机号、邮箱、`open_id`、`union_id`、`user_id`。

### 3. Diff 分类遵循现有同步身份规则

- Department：以 `FeishuDepartmentMapping.ExternalId` 和目标组织判断 create/update/unchanged；缺少 ID、缺少父级或父级无法映射计为 invalid/conflict。
- User：以 `user_id` 为主，兼容现有 `User.Lark`、Feishu user mapping、历史 `open_id`/`union_id` 规则；缺少稳定用户 ID 计为 invalid，多个本地候选计为 conflict。
- Membership：以用户和部门映射后的关系判断 create/update/unchanged；用户或部门未能映射计为 invalid/conflict。
- Soft-disable：只统计当前已启用 Feishu-sourced mapping 中不在 snapshot 的部门、用户和成员关系；不执行禁用。

原因：preview 必须和真实 sync 的身份决策一致，否则 operator 看到的风险与实际写入不一致。

### 4. Fail-closed diagnostics 复用 run diagnostics 枚举语义

dry-run preview 失败时返回稳定 `reasonCode` / `operatorAction` / `safeSummary`，例如：

- `credential_missing` 或现有 `missing_secret`：需要保存 App Secret。
- `runtime_authorization_required`：本地无法执行真实 Contact runtime gate。
- `contact_permission_missing`：通讯录权限不足。
- `contract_mismatch`：Contact snapshot shape 不符合预期。

前端只映射短标签，不解析 raw error。

### 5. 最近 preview 摘要优先作为当前页面状态

本 change 不新增 preview history 表。页面在一次 preview 后展示最近结果；后续如需要审计型历史，可用独立 change 设计只保存聚合 summary 的 preview record。

原因：避免在本 change 中引入 retention、清理、payload 脱敏和审计边界；当前目标是执行前预览能力。

## Risks / Trade-offs

- 真实 Contact v3 错误码与 mock 可能不完全一致 → 通过稳定错误包装和 fail-closed 分类兜底，真实凭证 gate 留给后续运行态验证。
- 不保存 preview history → 刷新页面后最近结果丢失；换来较低的敏感数据持久化风险。
- 只返回聚合 diff → operator 无法逐项核对所有对象；P0.5 先覆盖大规模风险预估，后续可在脱敏样例和分页明细上做独立设计。
- 独立 diff 逻辑可能与真实 apply 演进产生偏差 → 测试必须覆盖与现有 identity/mapping helper 一致的关键路径，并在后续修改真实 apply 时同步维护 preview。
