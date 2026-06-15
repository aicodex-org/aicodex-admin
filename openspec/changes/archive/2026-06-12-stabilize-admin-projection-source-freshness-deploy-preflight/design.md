## Context

当前 `50-Gateway Projection 观测/运行态观测.yml` 已能在 latest publish audit 存在时检查 `sourceConnectionSummary`，但它把校验逻辑内嵌在 Bruno after-response 脚本中，缺少可单测、可 dry-run 的 operator preflight 入口。60 环境仍返回旧 shape 时，operator 需要先得到稳定 blocked alias，判断是部署包或运行态 shape 过期，而不是把缺字段理解为 Admin source freshness 实现失败或完整业务成功。

## Goals / Non-Goals

**Goals:**

- 提供仓库内可复用、只读、无密的 projection observability shape preflight。
- 对缺 latest audit、旧 shape、缺 `sourceConnectionSummary`、缺 freshness counts 或缺布尔 freshness signals 输出稳定 blocked alias。
- 让 Bruno smoke 复用同一套 preflight 规则，避免 GUI/CLI 与单测行为漂移。
- 更新 runbook，说明 `environment_deploy_stale` 是部署/运行态 shape 阻断，不证明 Admin 代码失败。

**Non-Goals:**

- 不改 API、Insight 或 gateway owner 边界。
- 不写 gateway authorization facts，不读取 API/Insight/gateway 数据库。
- 不新增真实组织 fixture，不记录真实环境地址、账号、手机号、邮箱、token、Cookie 或完整响应体。
- 不改变 Admin projection publish、refresh 或 source freshness 计算实现。

## Decisions

1. **使用仓库脚本承载 preflight 规则。** 将 shape 校验抽成 `api-tests/bruno/aicodex-admin/scripts/gatewayProjectionObservabilityPreflight.js`，Bruno after-response 和 Node 单测都调用它。相比继续把逻辑写在 yml 中，这能先写失败用例并复用稳定 alias。
2. **部署/运行态旧 shape 统一映射为 `environment_deploy_stale`。** 当响应缺少 latest audit、`sourceConnectionStatus`、`sourceConnectionSummary`、status/freshness counts 或 freshness signals 时，preflight fail closed 并返回该 alias。相比新增多个 alias，单一部署过期 alias 更贴合 60 smoke 当前 blocker，且不把旧 shape 外推为业务失败。
3. **业务前置条件仍保留既有专用 alias。** 当启用 `gatewayProjectionMinSubjectCount` 或 tombstone 断言且 counts 不足时，preflight 保留 `no_publishable_subjects`，避免把 fixture 未就绪误报为部署包过期。

## Risks / Trade-offs

- **Bruno 运行时加载脚本路径不稳定** -> after-response 内保留内联 fallback 逻辑，Node 单测覆盖脚本主体；README 提供 CLI dry-run 入口。
- **旧 shape 与缺 latest audit 都映射为部署过期可能过粗** -> verification 记录同时输出 reason，operator 可根据 `reason` 判断是缺 audit、缺字段还是旧响应。
- **不触发真实 60 publish** -> 本 change 只能证明 Admin 仓库 preflight 行为，不能证明 60 环境已经部署新包；最终报告必须保留该边界。
