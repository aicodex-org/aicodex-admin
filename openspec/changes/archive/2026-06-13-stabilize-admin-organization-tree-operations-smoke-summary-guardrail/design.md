## Context

`40-组织树运营` 已有诊断、刷新状态和显式受控重建 Bruno 入口，主规格也要求 60 smoke 不得把普通空树、consumer-only 结果或 Insight fallback 记为 Admin 组织树运营能力通过。当前缺口在 operator 层：诊断响应、刷新状态和可选组织树响应需要人工拼接，缺少一个可单测、可复用、脱敏且 fail-closed 的 readiness summary。

本 change 只在 `aicodex-admin` 仓库内补 Admin-owned 只读 smoke summary，不改 API/Insight，不改 mapping 控制器或对象，不写真实 fixture，也不触发真实 read model 重建。

## Goals / Non-Goals

**Goals:**

- 提供 `organizationTreeOperationsSmokeSummary.js` 纯函数，输入诊断响应、可选刷新状态响应和可选组织树响应，输出稳定 summary。
- Summary 输出三类检查状态：`ready`、`blocked`、`not_checked`，并提供稳定 alias、owner handoff、最小解除条件和不能外推边界。
- 默认 fail closed：缺 lineage、source stale、read model 不可信、空树且未声明受控非空 fixture、刷新状态不可用或输入疑似敏感信息时均阻断。
- Bruno 入口保持只读：默认调用诊断接口，可通过私有变量传入刷新状态/组织树响应；不调用重建接口，不查询 DB，不写 fixture。

**Non-Goals:**

- 不新增或修改组织树后端 API、数据库 schema、read model builder 或真实同步逻辑。
- 不将 summary 作为 API/gateway 授权事实、Insight 报表 scope 或跨服务 contract。
- 不记录真实账号、完整 organizationId、完整组织树、手机号、邮箱、token、Cookie、source tenant metadata 或完整来源响应体。
- 不把 consumer-only 响应、Insight fallback 或普通空树外推为 Admin 非空组织树能力通过。

## Decisions

1. **使用纯函数脚本组合只读响应。** 脚本不发 HTTP、不读写文件、不持有凭据，由 Bruno after-response 或 Node 单测传入响应。这样能复用现有 `gatewayProjectionReadinessSummary` 模式，并避免把 summary 入口变成新的 runtime 依赖。

2. **检查级状态与整体状态分离。** 每个检查输出 `ready`、`blocked` 或 `not_checked`，整体 summary 只在没有阻断且关键非空证明齐全时为 `ready`；存在未检查项但无阻断时为 `not_checked`。这样 operator 能区分“未检查刷新状态”和“已证明不可通过”。

3. **稳定 alias 优先于原始响应。** Summary 只输出 alias、reason、counts、handoff 和最小解除条件，不输出原始节点、完整 lineage 或完整环境标识。常见 alias 包括 `empty_tree`、`non_empty_fixture_missing`、`read_model_untrusted`、`source_connection_stale`、`lineage_missing`、`refresh_status_unavailable`、`sanitization_failed`。

4. **非空组织树证明需要受控 fixture 或可信诊断。** 只有诊断/树响应显示节点非空、lineage/freshness/sourceConnection/readModelSource 可信，并且没有 consumer-only 或 Insight fallback 信号时，summary 才能返回 `ready`。空树即使是业务空结果，也不能证明 Admin 非空组织树能力通过。

## Risks / Trade-offs

- Summary 依赖响应 shape 归纳状态，不能证明远端环境已部署最新 Admin 包。缓解：旧 shape 或关键字段缺失映射到稳定阻断 alias，并要求 operator 先修诊断/部署口径。
- Bruno 无法天然共享多请求响应。缓解：默认只读诊断入口，可选通过私有变量传入刷新状态和组织树响应；Node 单测覆盖组合逻辑。
- 为避免泄漏，summary 会丢弃原始节点和完整 lineage。代价是排障需要回到 Admin 受控诊断页面查看详细脱敏信息。
