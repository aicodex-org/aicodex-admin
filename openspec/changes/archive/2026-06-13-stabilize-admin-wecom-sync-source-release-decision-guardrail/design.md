## Context

WeCom source readiness handoff 已输出 `status`、稳定 `aliases`、owner handoff、最小解除条件和安全下一步。协调层需要一个更小、更保守的 release decision 字段，用来判断是否可以把当前 Admin source evidence 交给后续组织树只读 readiness 或 controlled smoke 准备。

## Goals / Non-Goals

Goals:

- 只消费 Admin-owned、脱敏的 source readiness handoff 摘要。
- 输出稳定 `decision=ready_for_org_tree_readiness` 或 `decision=blocked`，并保留 `reasonAlias`。
- 对敏感字段、完整响应体、真实 fixture/DB 信息和下游成功断言 fail closed。
- 明确 ready 也只允许进入后续 owner 的只读 readiness / controlled smoke 准备。

Non-Goals:

- 不新增或修改后端业务 API。
- 不调用 `手动触发同步.yml`，不创建 sync run，不写真实 DB 或 fixture。
- 不读取 API、Insight、Gateway 数据，不形成跨 owner 合同。
- 不证明组织树非空、projection 发布成功、authorization facts 生效或 full-success。

## Decisions

- Decision: release decision helper 接收 `sourceReadinessHandoff`，不重新解释 WeCom config/runs 原始响应。
  - Rationale: readiness handoff 已负责 source 证据分类；release guardrail 只做 operator-facing 决策收口，避免重复处理原始证据。
- Decision: `wecom_source_ready` 映射为 `ready_for_org_tree_readiness`，其它 source readiness blocking alias 映射为 `blocked`。
  - Rationale: 下游 owner 只需要知道是否允许继续只读准备，以及阻断原因的稳定 alias。
- Decision: 输入出现 token、Cookie、私有 URL、真实账号、完整组织树、真实 fixture/DB 信息、Gateway/API/Insight 成功断言或 full-success 迹象时返回 `reasonAlias=sanitization_failed`。
  - Rationale: guardrail 的核心价值是防止把 source readiness evidence 外推到跨 owner 成功结论。

## Risks / Trade-offs

- 如果 operator 未先运行 `同步 runs.yml` 或 `Source Readiness Handoff.yml`，release decision 会停在 `wecom_source_readiness_not_checked` 或上游 blocking alias。
- 该 helper 可能拒绝包含下游成功断言的输入；这是有意 fail closed，解除方式是删除下游断言并只提供脱敏 source readiness handoff。

## Migration Plan

无需迁移。该 change 只新增 Bruno/helper/OpenSpec 文档，不改变后端 API、数据库结构或持久化数据。
