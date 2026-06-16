# Change: Admin WeCom source release guardrail

## Why

已归档的 WeCom source readiness handoff 能判断 Admin WeCom source 是否具备最小只读 readiness evidence，但 operator 仍需要一个更小的 release decision guardrail，避免把 `wecom_source_ready` 外推成组织树非空、Gateway projection 可发布、authorization facts 生效或 full-success。

## What Changes

- 新增本地只读 `wecomSourceReleaseDecision` helper，将脱敏 source readiness handoff 转成最小 release decision。
- 新增 Bruno `30-WeCom 同步/Source Release Decision.yml`，排在真实写入口之前，只读输出 `decision`、`reasonAlias`、最小解除条件、安全下一步和禁止继续原因。
- 更新 Bruno README，说明执行顺序、门禁变量、owner handoff、敏感输入 fail-closed 和不能外推边界。
- 更新 `wecom-organization-sync` spec，声明该 guardrail 只允许进入后续 owner 的只读 readiness / controlled smoke 准备。

## Impact

- Affected specs: `wecom-organization-sync`
- Affected code/docs: `api-tests/bruno/aicodex-admin/30-WeCom 同步/**`、`api-tests/bruno/aicodex-admin/scripts/wecomSourceReleaseDecision*`、`api-tests/bruno/aicodex-admin/README.md`
- Non-goals: 不新增后端 API，不触发 WeCom 手动同步，不写真实 DB/fixture，不查询 API/Insight/Gateway，不证明组织树非空、projection 可发布、authorization facts 生效或 full-success。
