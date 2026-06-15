# 设计

## 目标

组织树 evidence snapshot 面向 operator 证据回传场景：把诊断响应、只读刷新状态、可选组织树响应或 operator 粘贴的受控响应整理为稳定、脱敏、fail-closed 的最小证据包。

## 方案

- 新增 `organizationTreeOperationsEvidenceSnapshot.js`，导出 `createOrganizationTreeOperationsEvidenceSnapshot(input, options)`。
- 内部调用 `evaluateOrganizationTreeOperationsSmokeSummary(input, options)`，避免重复组织树 readiness 规则。
- 输出 `status`、`aliases`、`counts`、`checks`、`handoffs`、`minimumUnblockConditions`、`boundaries`、`evidence` 和 `leaseReleaseRecommendation`。
- `evidence` 只保留快照生成时间、来源状态、summary 状态、稳定 alias、counts 和检查状态，不保留原始 `diagnosticsResponse`、`refreshStatusResponse`、`organizationTreeResponse` 或节点详情。
- 快照 guardrail 在生成 summary 前先扫描输入；只要发现敏感字段、私有 URL、账号、完整响应体迹象或完整节点列表迹象，即 fail closed 为 `organization_tree_evidence_sanitization_failed`，只返回最小排障字段。

## 脱敏与 fail closed

以下信号阻断 evidence snapshot：

- token、Cookie、Authorization、Bearer、secret/config ref。
- 私有 URL、内网 IP、localhost 或带协议 URL。
- 邮箱、手机号、显式账号字段。
- 来源租户 metadata。
- 原始响应体字段，例如 `body`、`rawBody`、`responseBody`。
- 完整组织树节点列表迹象，例如多节点对象包含 `name`、`children`、`parentId/path` 等可还原结构字段。

阻断输出只包含稳定 alias、reason、最小解除条件和边界，不包含原始输入值。

## 边界

- Evidence snapshot 不是非空组织树能力证明，除非输入已通过受控非空组织树检查。
- Evidence snapshot 不证明 `subjectCount>=1`。
- Evidence snapshot 不是 API/Gateway/Insight 授权事实，不允许下游本地补算组织树、scope 或 projection。
