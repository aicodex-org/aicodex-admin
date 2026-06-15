## Why

Admin gateway projection controlled smoke 路线已经具备 operator decision package，但 operator 仍缺少一份更小的 action handoff，用来从 decision package 直接得到 owner-safe action status、next action、blocker alias、minimum unblock condition、do-not-dispatch-until 和 cannot-infer 边界。没有该 handoff 时，协调层仍可能把 decision ready 误派发为真实 controlled smoke pass、full-success、Gateway ingestion 或跨 owner 成功。

## What Changes

- 新增 Admin-owned controlled smoke operator action handoff，用本地脱敏 operator decision package 生成 operator action handoff。
- 输出稳定 `actionStatus`：`ready-for-operator-action`、`blocked`、`needs-user-action` 或 `hard-red-line`，并给出 `nextAction`、`blockerAlias`、owner handoff limit、最小解除条件、`doNotDispatchUntil` 和 `cannotInferBoundaries`。
- 对缺失 decision package、非 ready decision、needs-user-action、hard-red-line、未知 alias、敏感字段、真实 publish/controlled smoke/Gateway ingestion/authorization facts/fixture/DB/production-like 信号和 full-success/cross-owner overclaim 全部 fail closed。
- 新增 Node helper/test、Bruno local-only 入口和 operator README 说明。Bruno pre-request 输出本地脱敏 action handoff 后主动中止网络请求，避免误连真实环境。
- 同步 `admin-gateway-organization-projection-publisher` spec，明确 operator action handoff 只表示 Admin 本地脱敏 action package 可用于值班执行判断，不能证明真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts、API/Gateway/Insight 成功、生产就绪或 full-success。

## Capabilities

### New Capabilities

### Modified Capabilities
- `admin-gateway-organization-projection-publisher`: 增加 Admin controlled smoke operator action handoff 的 fail-closed 要求和可验收场景。

## Non-Goals

- 不修改 API、Insight、Gateway 或 WeCom 同步 owner 代码。
- 不触发真实 publish、Gateway ingestion、controlled smoke、mapping confirm、read model rebuild、endpoint/provider token、fixture/DB 写入或密钥变更。
- 不写真实 fixture，不清理真实数据，不声明 controlled smoke pass、full-success、Gateway allow、API authorization report full-success、Insight success 或生产就绪。

## Impact

- 影响范围限定在 `aicodex-admin` 的 Admin gateway projection Bruno 本地入口、Node helper/test、operator README、OpenSpec change/archive 和 `admin-gateway-organization-projection-publisher` 主规格。
- 输出用于本地脱敏 operator action 判断、补证、停止派发或继续交接，不依赖真实环境或新依赖。
