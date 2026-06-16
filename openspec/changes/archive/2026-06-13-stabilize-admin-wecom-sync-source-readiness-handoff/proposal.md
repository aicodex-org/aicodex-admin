# Change: Stabilize Admin WeCom source readiness handoff

## Why

Admin operator 需要一个只读、可复制的 WeCom source readiness 交接结果，用来判断企业微信通讯录同步 source 是否具备支撑组织树和后续 projection 的基本前置条件。现有 Bruno 入口只能分别读取配置和 runs，缺少稳定 alias、owner handoff、最小解除条件和脱敏输出边界。

## What Changes

- 新增 `30-WeCom 同步/Source Readiness Handoff.yml`，只读读取 WeCom sync config，并消费脱敏 runs/config-test 摘要生成 handoff。
- 新增 `wecomSourceReadinessHandoff.js` helper 与 Node 测试，稳定输出 `wecom_config_missing`、`wecom_config_disabled`、`wecom_credential_not_verified`、`wecom_latest_run_failed`、`wecom_no_recent_success`、`wecom_run_active`、`wecom_source_ready` 等分类。
- 更新 Bruno README，说明 operator 执行顺序、私有变量、稳定 alias、最小解除条件和不可外推边界。
- 同步 `wecom-organization-sync` 主规格，要求 source readiness handoff 不触发同步写入、不暴露敏感信息、不读取跨 owner 数据。

## Impact

- Affected specs: `wecom-organization-sync`
- Affected code/docs: `api-tests/bruno/aicodex-admin/30-WeCom 同步/**`、`api-tests/bruno/aicodex-admin/scripts/wecomSourceReadinessHandoff*`、`api-tests/bruno/aicodex-admin/README.md`
- Non-goals: 不新增后端 API，不触发手动同步，不证明组织树非空、Gateway projection、authorization report 或 full-success。
