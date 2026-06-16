## Why

60 Admin smoke 已证明运行态仍是旧部署 shape，缺少 `sourceConnectionSummary` 与 freshness counts。这个结果代表部署/配置过期，而不是 Admin projection source freshness 代码一定失败；需要在 Admin 仓库固化只读 preflight，让 operator 在执行 smoke 前先判断部署包和运行态响应是否具备 source freshness 诊断能力。

## What Changes

- 新增 gateway projection observability 的只读部署/运行态 shape preflight，验证 `sourceConnectionStatus` 兼容字段、`sourceConnectionSummary`、status/freshness counts 和布尔 freshness signals。
- preflight 在缺部署、旧 shape、缺 latest audit 或缺 source freshness summary 时 fail closed，并输出稳定 blocked alias，优先使用 `environment_deploy_stale` 表达部署包或运行态 shape 过期。
- 更新 Bruno smoke/runbook，使旧 shape 不会被记录为完整业务成功，并说明该诊断只属于 Admin producer observability，不写 gateway authorization facts，不查询 API/Insight/gateway 存储。
- 不改 API、Insight、gateway authorization facts，不新增真实组织 fixture，不查询、写入或清理真实数据库明细。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-gateway-organization-projection-publisher`: 增加 operator preflight 对部署包/运行态 source freshness observability shape 的稳定阻断语义。

## Impact

- 影响 Admin 仓库内 OpenSpec 文档、Bruno smoke/runbook 和本地只读 preflight 脚本/测试。
- 不改变生产 API 契约、数据库 schema、gateway publish 行为或真实环境配置。
