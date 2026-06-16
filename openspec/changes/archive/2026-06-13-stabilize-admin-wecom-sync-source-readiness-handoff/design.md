## Context

企业微信组织同步已有配置读取、runs 查询和手动触发入口。operator 当前需要在 Admin owner 边界内把 source readiness 交给后续组织树/projection owner，但不能触发写入、读取 API/Insight/Gateway 数据，也不能把真实凭据或完整响应体写进验证记录。

## Goals / Non-Goals

- Goals:
  - 提供只读 Bruno handoff 入口，输出稳定、可复制、脱敏的 readiness 分类。
  - 复用现有 `/api/wecom-org-sync/config` 和 `/api/wecom-org-sync/runs` 只读证据。
  - 明确 owner handoff、最小解除条件、安全下一步和不能外推边界。
- Non-Goals:
  - 不新增或修改后端业务 API。
  - 不调用 `手动触发同步.yml`，不创建 sync run，不写 DB。
  - 不证明组织树、Gateway projection、authorization report 或 full-success。

## Decisions

- Decision: Bruno handoff 当前请求只读 config endpoint，并消费 `同步 runs.yml` 缓存的脱敏 run 摘要。
  - Rationale: Bruno 单请求入口保持简单；runs 查询仍由现有只读请求负责，且缓存前会裁剪为 `status` 和时间字段。
- Decision: helper 只输出 `status`、`aliases`、`ownerHandoffs`、`minimumUnblockConditions`、`safeNextActions`、`evidenceShapeVersion`。
  - Rationale: 降低 operator 复制敏感字段或完整响应体的风险。
- Decision: readiness 需要启用配置、凭据验证证据或成功 run、无 active/latest failed run、并有 freshness 窗口内 succeeded run。
  - Rationale: 该口径只证明 source readiness 基本可交接，不外推后续消费者链路。

## Risks / Trade-offs

- 如果 operator 未先执行 `同步 runs.yml`，handoff 会停在 `wecom_credential_not_verified` 或无法证明 recent success。README 记录了推荐顺序。
- 如果真实 config/test 结果需要参与判断，operator 只能通过私有变量传入脱敏布尔摘要，不提交真实响应。

## Migration Plan

无需迁移。该 change 只新增 Bruno/helper/OpenSpec 文档，不改变后端 API 或持久化结构。
