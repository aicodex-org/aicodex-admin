# Design

## 目标

为 Admin producer 的 cleanup execute readiness 补充 P0 审批审计 trail/read model，让 operator 能看到与一次 readiness 相关的安全动作记录：`approve`、`reject`、`copy`、`export`、`refresh` 等。该 trail 服务于后续真实 cleanup 执行前的 accountability，不承担执行语义。

## 决策

### Storage scope

P0 使用 Admin-owned 持久 storage/read model，复用 publish attempt history 的 object/controller/router 分层和 xorm table 模式新增 audit trail 记录。响应固定返回 `storageScope=admin_cleanup_approval_audit_trail.v1`。

本 change 不要求真实 cleanup 执行记录存在，也不写下游 Gateway facts。

### Action 语义

- `refresh`：operator 刷新 readiness 或 audit trail。
- `copy` / `export`：operator 复制或导出脱敏 readiness/audit JSON。
- `approve` / `reject`：只代表执行前审批预览动作或人工判断记录，不打开执行 gate。

所有 action 都必须保留 `executeEnabled=false` / `dryRunOnly=true` 的 P0 guardrail 语义。

### 脱敏与边界

Audit record 只能包含 alias、hash、计数、policy/version、safe next action、disabled reason 和 storage scope，不包含 raw Gateway response、token、Cookie、私有 URL、完整组织树或真实 subject/resource 明细。

Gateway receipt hint 只能作为诊断线索，不能作为 Admin 权威事实或 runtime authorization success。

## 接口草案

- `GET /api/gateway-projection/publish-attempt-retention-cleanup-approval-audit-trail`
  - required：`organization`
  - optional：`action`、`approvalState`、`readinessHash`、`limit`
  - 返回：`storageScope`、`records[]`、`summary`、`export`。

- `POST /api/gateway-projection/publish-attempt-retention-cleanup-approval-audit-trail`
  - body 包含 `organizationId`、`action`、`readinessHash`、`readiness`、`safeNextAction`、`disabledReasons`、`candidateCount`、`retentionPolicyVersion`、`approvalState`。
  - 只记录脱敏审计，不执行 cleanup。

## 风险和缓解

- 风险：审批 action 被误解为真实执行授权。
  - 缓解：字段和 UI 明确 `executeEnabled=false`、`dryRunOnly=true`、`safeNextAction`，文案说明不是 cleanup execution。
- 风险：审计记录泄漏敏感 payload。
  - 缓解：只接受/返回 alias/hash/count/version，不保存 raw response 或主体明细；测试覆盖 redaction。
- 风险：与并行 Admin directory remediation execution approval preview 冲突。
  - 缓解：只修改 gateway projection cleanup attempt/readiness 相关写集，不碰 directory remediation execution approval preview 文件。
