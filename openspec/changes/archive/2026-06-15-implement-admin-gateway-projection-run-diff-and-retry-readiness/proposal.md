## Why

Admin 已具备 gateway projection publisher、manual publish console、进程内 latest publish observability 和 mapping readiness 诊断，但 operator 仍缺少一个只读的“run diff + retry readiness”摘要来判断失败发布的下一步：可以安全 retry、需要等待 source refresh，还是需要修复 mapping/subject 数据。

本 change 目标是在 Admin owner 边界内，把最近一次或指定一次 projection publish run 的 Admin-owned 差异、失败分类和重试建议收敛为稳定脱敏 API 与页面摘要。能力只基于 Admin 当前组织主模型快照、projection build dry-run 和 Admin 记录的 latest publish attempt，不读取 API/Gateway/Insight runtime facts，不直连下游数据库。

## What Changes

- 新增 Admin-only gateway projection run readiness 查询 API，支持按组织读取最近一次 projection publish run，并可用 traceId/projectionBatchId 校验 operator 指定的 latest run。
- 返回稳定、脱敏摘要：source org/version、target gateway contractVersion 状态、subject projectionVersion 摘要、subject count、active/tombstone/unmapped/invalid counts、last failure alias、retry safety、operator action。
- 复用 manual publish / observability / mapping readiness 现有模型，不重复实现手动发布入口或跨 owner run store。
- 在 web-admin 现有 Platform API mapping / projection readiness 页面展示 run diff 与 retry readiness，帮助 operator 判断 retry、等待 source refresh 或修复 mapping/subject。
- 补后端和前端聚焦测试、OpenSpec strict 校验、覆盖率与验证记录。

## Non-Goals

- 不修改 API、Insight、RedClaw 或 Gateway 仓库。
- 不直连或读取 API/Gateway 内部 projection store、runtime authorization facts、Insight report scope 或下游数据库。
- 不改飞书/企微组织同步实现和配置；现有同步触发点只作为读取上下文，不纳入写集。
- 不重复实现 manual publish console、publisher、refresh worker 或 publish attempt history。
- 不打开真实 gate，不写真实 fixture，不执行生产/类生产数据操作。
- 不返回 token、Cookie、私有 URL、真实组织树、真实 subject 明细、手机号、邮箱或 raw gateway response。

## Impact

- Admin operator 可以在现有映射控制台直接看到最近 publish run 与当前 Admin source snapshot 的差异和 retry 建议。
- 失败发布的处理路径更明确：retry、wait_source_refresh、fix_mapping_or_subject、fix_publisher_config 或 inspect_gateway_contract。
- 能力仍是 Admin producer 诊断，不证明 Gateway/API/Insight 授权成功，也不扩大 owner 边界。
