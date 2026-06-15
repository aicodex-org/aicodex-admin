## Why

Admin gateway projection controlled smoke 路线已经把 operator decision 收口成 owner-safe action package，但协调层仍缺少最终 readiness handoff 来判断该 action package 是否真的可以交给 operator 排队执行、是否必须阻断、或是否还需要用户动作。没有这层 readiness package，`ready-for-operator-action` 仍可能被误写成 controlled smoke pass、full-success、Gateway ingestion 或跨 owner 成功。

## What Changes

- 新增 Admin-owned controlled smoke operator readiness handoff，用本地脱敏 operator action package 生成最终 readiness package。
- 输出稳定 `readinessStatus`：`ready-for-operator-readiness-handoff`、`blocked`、`needs-user-action` 或 `hard-red-line`，并提供 `readyChecks`、`blockedAlias`、`minimumUnblockConditions`、`doNotDispatchUntil`、`ownerSafeNextActions`、`evidenceReferences`、`cannotInfer` 和不能外推边界。
- 对缺失 action package、非 ready action、needs-user-action、hard-red-line、未知 alias、敏感字段、真实 publish/controlled smoke/Gateway ingestion/authorization facts/fixture/DB/production-like 信号、mapping confirm/read model rebuild/gate 信号和 full-success/cross-owner overclaim 全部 fail closed。
- 新增 Node helper/test、Bruno local-only 入口和 operator README 说明。Bruno pre-request 输出本地脱敏 readiness handoff 后主动中止网络请求，避免误连真实环境。
- 同步 `admin-gateway-organization-projection-publisher` spec，明确 readiness handoff 只表示 Admin 本地脱敏 action package 已满足交接条件，不能证明真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts、API/Gateway/Insight 成功、生产就绪或 full-success。

## Capabilities

### New Capabilities

### Modified Capabilities
- `admin-gateway-organization-projection-publisher`: 增加 Admin controlled smoke operator readiness handoff 的 fail-closed 要求和可验收场景。

## Non-Goals

- 不修改 API、Insight、Gateway 或 WeCom 同步 owner 代码。
- 不触发真实 publish、Gateway ingestion、controlled smoke、mapping confirm、read model rebuild、endpoint/provider token、fixture/DB 写入、gate 或密钥变更。
- 不写真实 fixture，不清理真实数据，不声明 controlled smoke pass、full-success、Gateway allow、API authorization report full-success、Insight success 或生产就绪。

## Impact

- 影响范围限定在 `aicodex-admin` 的 Admin gateway projection Bruno 本地入口、Node helper/test、operator README、OpenSpec change/archive 和 `admin-gateway-organization-projection-publisher` 主规格。
- 输出用于本地脱敏 operator readiness 判断、补证、停止派发或继续交接，不依赖真实环境或新依赖。
