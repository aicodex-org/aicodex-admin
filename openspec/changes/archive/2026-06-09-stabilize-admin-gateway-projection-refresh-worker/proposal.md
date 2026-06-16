## Why

API/gateway projection freshness TTL 当前只有 1800 秒；如果 admin 只在企业微信同步成功时发布一次 projection，后续 gateway projection 会过期，Insight 的 projection-status 会再次从 ok 变成 expired。需要由 admin 基于当前组织主模型周期性刷新 gateway projection，保持 runtime 授权输入新鲜。

## What Changes

- 在既有 WeCom 同步成功后发布 admin -> gateway projection 的基础上，明确该触发路径必须继续保持可配置、脱敏日志和非阻塞同步 run 终态。
- 新增 gateway projection refresh worker，按配置周期枚举当前 admin 平台组织主模型中的组织，并复用既有 `GatewayProjectionService.BuildAndPublishOrganization` 重新发布 projection。
- refresh 默认周期小于 API freshness TTL，默认 15 分钟，且必须在 `gatewayOrganizationProjectionEnabled=true` 且 endpoint/token 已配置时才运行。
- refresh publish 必须保持幂等：组织未变化时保持同一个 gateway `orgVersion`，用新的 `projectionBatchId`、subject `projectionVersion` 和 `freshness.expiresAt` 刷新 freshness，不生成 gateway resource authorization facts，不写权限矩阵。
- 全量 refresh 必须包含 active subjects；离职、删除、禁用或冲突主体必须以 lifecycle tombstone 投影给 gateway，不能靠 subject 缺失表达删除。
- 验证目标包括：本地单测、OpenSpec 校验、diff 检查，以及 60 测试环境超过 1800 秒后 projection-status 仍保持 ok。

## Capabilities

### New Capabilities

无。本 change 不新增独立能力，而是在既有 `admin-gateway-organization-projection-publisher` 能力下补齐 freshness refresh 行为。

### Modified Capabilities

- `admin-gateway-organization-projection-publisher`: 增加配置化 refresh worker，要求 admin 在同步成功触发之外周期性刷新 gateway organization projection，并保持 publisher 幂等、脱敏和跨服务边界。

## Impact

- 影响 `admin/object/gateway_organization_projection_*`、WeCom 同步触发路径、admin 进程启动 worker、配置项、测试和验证文档。
- 不影响 Insight report scope、API/gateway resource authorization facts、runtime allow/deny 决策或权限矩阵写入。
- 依赖 API/gateway 现有 projection ingestion endpoint 和 projection-status provider；API 会按同 `orgVersion` 多 batch 的 latest freshness 判定，admin 只负责 producer/refresh，不允许 Insight 或 API 直连 admin 源库补算 projection。
